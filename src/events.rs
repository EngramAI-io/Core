use crate::protocol::JsonRpcMessage;
use serde::{Deserialize, Serialize};
use std::time::SystemTime;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<u64>,
    pub payload: serde_json::Value,
}

impl McpLog {
    pub fn new(
        direction: StreamDirection,
        message: JsonRpcMessage,
        latency_ms: Option<u64>,
    ) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let method = message.get_method().map(|s| s.to_string());
        let request_id = message.get_id();

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

