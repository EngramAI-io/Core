use crate::events::McpLog;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Router,
};
use rust_embed::RustEmbed;
use std::sync::Arc;
use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::StreamExt;

#[derive(RustEmbed)]
#[folder = "frontend/dist"]
struct Assets;

pub struct ServerState {
    pub event_tx: broadcast::Sender<McpLog>,
}

pub async fn start_server(event_tx: broadcast::Sender<McpLog>) -> Result<(), Box<dyn std::error::Error>> {
    let state = Arc::new(ServerState { event_tx });

    let app = Router::new()
        .route("/ws", get(websocket_handler))
        .route("/*path", get(serve_static))
        .route("/", get(serve_index))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await?;
    eprintln!("Sentinel dashboard running on http://localhost:3000");
    
    axum::serve(listener, app).await?;
    Ok(())
}

async fn serve_index() -> impl IntoResponse {
    serve_static(axum::extract::Path("index.html".to_string())).await
}

async fn serve_static(axum::extract::Path(path): axum::extract::Path<String>) -> impl IntoResponse {
    let path = if path.is_empty() { "index.html" } else { &path };
    
    match Assets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            (
                StatusCode::OK,
                [("content-type", mime.as_ref())],
                content.data,
            )
                .into_response()
        }
        None => {
            // For SPA routing, serve index.html for unknown routes
            match Assets::get("index.html") {
                Some(content) => (
                    StatusCode::OK,
                    [("content-type", "text/html")],
                    content.data,
                )
                    .into_response(),
                None => (StatusCode::NOT_FOUND, "Not found").into_response(),
            }
        }
    }
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<ServerState>>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<ServerState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = BroadcastStream::new(state.event_tx.subscribe());

    // Task to send events to client
    let send_task = tokio::spawn(async move {
        while let Ok(Some(event)) = rx.try_next() {
            let json = match serde_json::to_string(&event) {
                Ok(j) => j,
                Err(_) => continue,
            };
            if sender.send(Message::Text(json)).await.is_err() {
                break;
            }
        }
    });

    // Task to receive messages from client (ping/pong)
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if matches!(msg, Message::Close(_)) {
                break;
            }
        }
    });

    // Wait for either task to finish
    tokio::select! {
        _ = send_task => {
            recv_task.abort();
        }
        _ = recv_task => {
            send_task.abort();
        }
    };
}


