use crate::protocol::JsonRpcMessage;
use serde::{Deserialize, Serialize};
use std::time::SystemTime;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum StreamDirection {
    Inbound,  // From child stdout (response)
    Outbound, // From parent stdin (request)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpLog {
    pub timestamp: u64, // Unix timestamp in milliseconds
    pub direction: StreamDirection,
    pub method: Option<String>,
    pub request_id: Option<u64>,
    pub latency_ms: Option<u64>,
    pub payload: serde_json::Value,
}

impl McpLog {
    pub fn from_message(
        direction: StreamDirection,
        message: JsonRpcMessage,
        latency_ms: Option<u64>,
    ) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let (method, request_id) = match &message {
            JsonRpcMessage::Request(req) => (
                Some(req.method.clone()),
                req.id, // Option<u64>
            ),
            JsonRpcMessage::Response(resp) => (None, resp.id),
        };

        let payload = match &message {
            JsonRpcMessage::Request(req) => serde_json::to_value(req).unwrap_or_default(),
            JsonRpcMessage::Response(resp) => serde_json::to_value(resp).unwrap_or_default(),
        };

        Self {
            timestamp,
            direction,
            method,
            request_id,
            latency_ms,
            payload,
        }
    }
}
