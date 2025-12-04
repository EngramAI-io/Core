use crate::events::McpLog;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
    routing::get,
    Router,
};
use serde_json;
use std::{net::SocketAddr, sync::Arc};
use tokio::sync::broadcast;
use tokio_stream::{wrappers::BroadcastStream, StreamExt};

pub struct ServerState {
    pub tx: broadcast::Sender<McpLog>,
}

pub async fn start_server(
    tx: broadcast::Sender<McpLog>,
) -> Result<(), Box<dyn std::error::Error>> {
    let state = Arc::new(ServerState { tx });

    let app = Router::new()
        .route("/ws", get(websocket_handler))
        .with_state(state);

    let addr: SocketAddr = "127.0.0.1:3000".parse()?;
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<ServerState>>,
) -> Response {
    ws.on_upgrade(move |socket| websocket_loop(socket, state))
}

async fn websocket_loop(mut socket: WebSocket, state: Arc<ServerState>) {
    let rx = state.tx.subscribe();
    let mut stream = BroadcastStream::new(rx);

    // We only send logs to the client; we ignore messages from the client for now.
    while let Some(Ok(log)) = stream.next().await {
        if let Ok(text) = serde_json::to_string(&log) {
            if socket.send(Message::Text(text)).await.is_err() {
                break;
            }
        }
    }
}
