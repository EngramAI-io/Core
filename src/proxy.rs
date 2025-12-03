use crate::events::StreamDirection;
use bytes::Bytes;
use std::process::{self, Stdio};
use tokio::io::{AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::sync::mpsc;

const CHANNEL_BUFFER_SIZE: usize = 1000;

pub async fn run_proxy(
    command: Vec<String>,
    tap_sender: mpsc::Sender<(StreamDirection, Bytes)>,
) -> Result<(), Box<dyn std::error::Error>> {
    if command.is_empty() {
        return Err("Empty command".into());
    }

    // Spawn child process
    let mut child = Command::new(&command[0])
        .args(&command[1..])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()?;

    let mut child_stdin = child.stdin.take().ok_or("Failed to open child stdin")?;
    let mut child_stdout = child.stdout.take().ok_or("Failed to open child stdout")?;

    // Create reader for child stdout
    let mut child_stdout_reader = BufReader::new(&mut child_stdout);

    // Get parent stdin
    let mut parent_stdin = tokio::io::stdin();
    let mut parent_stdout = tokio::io::stdout();

    // Spawn task for proxying stdin -> child_stdin with tap
    let tx_stdin = tap_sender.clone();
    let stdin_handle = tokio::spawn(async move {
        let mut buf = vec![0u8; 8192];
        loop {
            match parent_stdin.read(&mut buf).await {
                Ok(0) => break, // EOF
                Ok(n) => {
                    let data = Bytes::copy_from_slice(&buf[..n]);
                    
                    // Tap: try to send to analysis channel (non-blocking)
                    let _ = tx_stdin.try_send((StreamDirection::Outbound, data.clone()));
                    
                    // Forward to child
                    if let Err(e) = child_stdin.write_all(&buf[..n]).await {
                        eprintln!("Error writing to child stdin: {}", e);
                        break;
                    }
                }
                Err(e) => {
                    eprintln!("Error reading from stdin: {}", e);
                    break;
                }
            }
        }
        let _ = child_stdin.shutdown().await;
    });

    // Spawn task for proxying child_stdout -> stdout with tap
    let tx_stdout = tap_sender.clone();
    let stdout_handle = tokio::spawn(async move {
        let mut buf = vec![0u8; 8192];
        loop {
            match child_stdout_reader.read(&mut buf).await {
                Ok(0) => break, // EOF
                Ok(n) => {
                    let data = Bytes::copy_from_slice(&buf[..n]);
                    
                    // Tap: try to send to analysis channel (non-blocking)
                    let _ = tx_stdout.try_send((StreamDirection::Inbound, data.clone()));
                    
                    // Forward to parent stdout
                    if let Err(e) = parent_stdout.write_all(&buf[..n]).await {
                        eprintln!("Error writing to stdout: {}", e);
                        break;
                    }
                    let _ = parent_stdout.flush().await;
                }
                Err(e) => {
                    eprintln!("Error reading from child stdout: {}", e);
                    break;
                }
            }
        }
    });

    // Wait for streams to finish
    let _ = tokio::join!(stdin_handle, stdout_handle);

    // Wait for child to exit
    let status = child.wait().await?;

    // Exit with child's exit code
    process::exit(status.code().unwrap_or(1));
}

