use std::collections::HashMap;
use std::time::Instant;

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

    pub fn complete_request(&mut self, request_id: Option<u64>) -> Option<u64> {
        let request_id = request_id?;
        let start_time = self.pending_requests.remove(&request_id)?;
        let latency = start_time.elapsed().as_millis() as u64;
        Some(latency)
    }

    pub fn clear_old_requests(&mut self, max_age_seconds: u64) {
        let cutoff = Instant::now() - std::time::Duration::from_secs(max_age_seconds);
        self.pending_requests.retain(|_, &mut time| time > cutoff);
    }
}

impl Default for SessionState {
    fn default() -> Self {
        Self::new()
    }
}

