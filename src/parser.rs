use crate::events::{McpLog, StreamDirection};
use crate::protocol::JsonRpcMessage;
use crate::redaction;
use crate::session::SessionState;
use bytes::Bytes;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::sync::mpsc;

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

    pub async fn process_stream(
        &self,
        mut rx: mpsc::Receiver<(StreamDirection, Bytes)>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Buffer for accumulating partial lines
        let mut buffers: std::collections::HashMap<StreamDirection, Vec<u8>> =
            std::collections::HashMap::new();

        while let Some((direction, data)) = rx.recv().await {
            let buffer = buffers.entry(direction).or_insert_with(Vec::new);
            buffer.extend_from_slice(&data);

            // Process complete lines
            while let Some(newline_pos) = buffer.iter().position(|&b| b == b'\n') {
                let line = buffer.drain(..=newline_pos).collect::<Vec<u8>>();
                let line_str = String::from_utf8_lossy(&line[..line.len().saturating_sub(1)]);

                if !line_str.trim().is_empty() {
                    if let Err(e) = self
                        .parse_and_log_line(line_str.trim(), direction)
                        .await
                    {
                        eprintln!("Error parsing line: {}: {}", e, line_str);
                    }
                }
            }
        }

        Ok(())
    }

    async fn parse_and_log_line(
        &self,
        line: &str,
        direction: StreamDirection,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let message: JsonRpcMessage = serde_json::from_str(line)?;

        let latency_ms = if message.is_request() {
            // Record request start time
            if let Some(id) = message.get_id() {
                self.session_state.lock().await.record_request(id);
            }
            None
        } else {
            // Calculate latency for response
            let id = message.get_id();
            self.session_state.lock().await.complete_request(id)
        };

        let mut log = McpLog::new(direction, message, latency_ms);

        // Redact PII before sending
        redaction::redact_log(&mut log);

        // Try to send log (non-blocking)
        if let Err(e) = self.log_sender.try_send(log) {
            // Channel full - drop log (fail-open behavior)
            eprintln!("Warning: Log channel full, dropping log: {}", e);
        }

        Ok(())
    }

    pub async fn cleanup_old_requests(&self) {
        let mut state = self.session_state.lock().await;
        state.clear_old_requests(300); // Clear requests older than 5 minutes
    }
}

