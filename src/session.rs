use std::collections::HashMap;
use std::time::{Duration, Instant};

pub struct SessionState {
    pending_requests: HashMap<u64, Instant>,
}

impl SessionState {
    pub fn new() -> Self {
        Self {
            pending_requests: HashMap::new(),
        }
    }

    pub fn record_request(&mut self, request_id: u64) {
        self.pending_requests.insert(request_id, Instant::now());
    }

    /// Called when we see a response; returns latency in ms if we know the request.
    pub fn complete_request(&mut self, request_id: u64) -> Option<u64> {
        if let Some(start) = self.pending_requests.remove(&request_id) {
            let dur = start.elapsed();
            Some(dur.as_secs() * 1000 + dur.subsec_millis() as u64)
        } else {
            None
        }
    }

    /// Drop old requests older than `max_age_seconds` to avoid unbounded growth.
    pub fn clear_old_requests(&mut self, max_age_seconds: u64) {
        let cutoff = Instant::now() - Duration::from_secs(max_age_seconds);
        self.pending_requests.retain(|_, t| *t > cutoff);
    }
}

impl Default for SessionState {
    fn default() -> Self {
        Self::new()
    }
}
