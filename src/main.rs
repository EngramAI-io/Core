use clap::{Args, Parser, Subcommand};
use std::process;
use tokio::signal;
use tokio::sync::mpsc;

mod proxy;
mod protocol;
mod events;
mod parser;
mod session;
mod server;
mod config;
mod redaction;
mod panic;

use events::StreamDirection;
use parser::Parser;
use proxy::run_proxy;
use server::start_server;
use tokio::sync::broadcast;

#[derive(Parser)]
#[command(name = "sentinel")]
#[command(about = "MCP Interceptor - Transparent proxy for Model Context Protocol")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Run a command through the proxy
    Run(RunArgs),
    /// Install sentinel for a Claude Desktop MCP server
    Install {
        /// Name of the MCP server to intercept
        server_name: String,
    },
}

#[derive(Args)]
struct RunArgs {
    /// Command and arguments to run (everything after --)
    #[arg(num_args = 1.., last = true)]
    command: Vec<String>,
}

#[tokio::main]
async fn main() {
    // Install panic hook early
    panic::install_panic_hook();

    let cli = Cli::parse();

    match cli.command {
        Commands::Install { server_name } => {
            if let Err(e) = config::install(server_name) {
                eprintln!("Error: {}", e);
                process::exit(1);
            }
        }
        Commands::Run(args) => {
            if args.command.is_empty() {
                eprintln!("Error: No command provided after '--'");
                process::exit(1);
            }

            // Create channels for tapping and logging
            let (tap_tx, tap_rx) = mpsc::channel::<(StreamDirection, bytes::Bytes)>(1000);
            let (log_tx, mut log_rx) = mpsc::channel::<events::McpLog>(1000);
            let log_tx_clone = log_tx.clone();

            // Create broadcast channel for WebSocket clients
            let (ws_tx, _) = broadcast::channel::<events::McpLog>(1000);

            // Start HTTP/WebSocket server
            let ws_tx_server = ws_tx.clone();
            let server_handle = tokio::spawn(async move {
                if let Err(e) = start_server(ws_tx_server).await {
                    eprintln!("Server error: {}", e);
                }
            });

            // Start parser
            let parser = Parser::new(log_tx);
            let parser_handle = tokio::spawn(async move {
                if let Err(e) = parser.process_stream(tap_rx).await {
                    eprintln!("Parser error: {}", e);
                }
            });

            // Start log writer task and WebSocket broadcaster
            let ws_tx_broadcast = ws_tx.clone();
            let log_writer_handle = tokio::spawn(async move {
                let mut file = match tokio::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open("sentinel_debug.jsonl")
                    .await
                {
                    Ok(f) => tokio::io::BufWriter::new(f),
                    Err(e) => {
                        eprintln!("Warning: Failed to open log file: {}", e);
                        return;
                    }
                };

                while let Some(log) = log_rx.recv().await {
                    let json = match serde_json::to_string(&log) {
                        Ok(j) => j,
                        Err(e) => {
                            eprintln!("Warning: Failed to serialize log: {}", e);
                            continue;
                        }
                    };
                    if let Err(e) = tokio::io::AsyncWriteExt::write_all(
                        &mut file,
                        format!("{}\n", json).as_bytes(),
                    )
                    .await
                    {
                        eprintln!("Warning: Failed to write log: {}", e);
                    }
                    let _ = file.flush().await;

                    // Broadcast to WebSocket clients (ignore errors if no clients)
                    let _ = ws_tx_broadcast.send(log);
                }
            });

            // Handle Ctrl+C gracefully
            let ctrl_c = async {
                signal::ctrl_c()
                    .await
                    .expect("Failed to install Ctrl+C handler");
            };

            // Start proxy in a task
            let command = args.command;
            let proxy_handle = tokio::spawn(async move {
                if let Err(e) = run_proxy(command, tap_tx).await {
                    eprintln!("Proxy error: {}", e);
                    process::exit(1);
                }
            });

            // Wait for either Ctrl+C or proxy to finish
            tokio::select! {
                _ = ctrl_c => {
                    eprintln!("\nReceived interrupt signal");
                    proxy_handle.abort();
                    parser_handle.abort();
                    log_writer_handle.abort();
                    server_handle.abort();
                }
                result = proxy_handle => {
                    if let Err(e) = result {
                        eprintln!("Proxy task error: {:?}", e);
                        process::exit(1);
                    }
                    // Proxy finished, wait for parser and logger to finish
                    parser_handle.abort();
                    drop(log_tx_clone); // Close log channel to signal logger to stop
                    let _ = log_writer_handle.await;
                }
            }
        }
    }
}

