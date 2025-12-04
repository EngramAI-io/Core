use crate::events::{McpLog, StreamDirection};
use crate::protocol::JsonRpcMessage;
use crate::redaction;
use crate::session::SessionState;
use bytes::Bytes;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};

pub struct Parser {
    session_state: Arc<Mutex<SessionState>>,
    log_sender: mpsc::Sender<McpLog>,
}

impl Parser {
    pub fn new(log_sender: mpsc::Sender<McpLog>) -> Self {
        Self {
            session_state: Arc::new(Mutex::new(SessionState::new())),
            log_sender,
        }
    }

    /// Main loop: consume tapped bytes from the proxy and parse them into logs.
    pub async fn process_stream(
        &self,
        mut tap_rx: mpsc::Receiver<(StreamDirection, Bytes)>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        while let Some((direction, bytes)) = tap_rx.recv().await {
            if let Err(e) = self.handle_chunk(direction, bytes).await {
                eprintln!("Parser error while handling chunk: {}", e);
            }
        }
        Ok(())
    }

    async fn handle_chunk(
        &self,
        direction: StreamDirection,
        bytes: Bytes,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let text = match std::str::from_utf8(&bytes) {
            Ok(t) => t,
            Err(_) => return Ok(()), // Non-UTF8, skip
        };

        // Many JSON-RPC transports send one JSON object per line. We’ll assume that here.
        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            let value: serde_json::Value = match serde_json::from_str(line) {
                Ok(v) => v,
                Err(_) => {
                    // Not valid JSON; ignore
                    continue;
                }
            };

            let msg: JsonRpcMessage = match serde_json::from_value(value.clone()) {
                Ok(m) => m,
                Err(_) => {
                    // Not a valid JSON-RPC message; ignore
                    continue;
                }
            };

            // Track latency based on request / response ids
            let mut latency_ms = None;

            match &msg {
                JsonRpcMessage::Request(req) => {
                    if let Some(id) = req.id {
                        let mut state = self.session_state.lock().await;
                        state.record_request(id);
                    }
                }
                JsonRpcMessage::Response(resp) => {
                    if let Some(id) = resp.id {
                        let mut state = self.session_state.lock().await;
                        latency_ms = state.complete_request(id);
                    }
                }
            }

            // Build log record
            let mut log = McpLog::from_message(direction, msg, latency_ms);

            // Redact PII/secrets
            redaction::redact_log(&mut log);

            // Try to send; if channel is full, drop (fail-open)
            if let Err(e) = self.log_sender.try_send(log) {
                eprintln!("Warning: Log channel full, dropping log: {}", e);
            }
        }

        Ok(())
    }

    pub async fn cleanup_old_requests(&self) {
        let mut state = self.session_state.lock().await;
        state.clear_old_requests(300); // Clear requests older than 5 minutes
    }
}
