use regex::Regex;
use serde_json::Value;

lazy_static::lazy_static! {
    static ref API_KEY_PATTERN: Regex = Regex::new(r#"(?i)(?:api[_-]?key|apikey|access[_-]?token|secret[_-]?key)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{32,})["']?"#).unwrap();
    static ref SK_KEY_PATTERN: Regex = Regex::new(r#"sk-[a-zA-Z0-9]{32,}"#).unwrap();
    static ref EMAIL_PATTERN: Regex = Regex::new(r#"\b[\w\.-]+@[\w\.-]+\.\w+\b"#).unwrap();
    static ref TOKEN_PATTERN: Regex = Regex::new(r#"(?i)(?:token|bearer)\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]{20,})["']?"#).unwrap();
}

pub fn redact_pii(value: &mut Value) {
    match value {
        Value::String(s) => {
            let mut redacted = s.clone();
            
            // Redact API keys
            redacted = API_KEY_PATTERN.replace_all(&redacted, |caps: &regex::Captures<'_>| {
                let matched = caps.get(0).map(|m| m.as_str()).unwrap_or("");
                format!("{}***", &matched[..8.min(matched.len())])
            }).to_string();
            
            // Redact sk- keys
            redacted = SK_KEY_PATTERN.replace_all(&redacted, |caps: &regex::Captures<'_>| {
                let matched = caps.get(0).map(|m| m.as_str()).unwrap_or("");
                format!("{}***", &matched[..8.min(matched.len())])
            }).to_string();
            
            // Redact emails
            redacted = EMAIL_PATTERN.replace_all(&redacted, |caps: &regex::Captures<'_>| {
                let email = caps.get(0).map(|m| m.as_str()).unwrap_or("");
                if let Some(at_pos) = email.find('@') {
                    format!("{}***@***", &email[..at_pos.min(3)])
                } else {
                    "***".to_string()
                }
            }).to_string();
            
            // Redact tokens
            redacted = TOKEN_PATTERN.replace_all(&redacted, |caps: &regex::Captures<'_>| {
                let matched = caps.get(0).map(|m| m.as_str()).unwrap_or("");
                format!("{}***", &matched[..8.min(matched.len())])
            }).to_string();
            
            if redacted != *s {
                *value = Value::String(redacted);
            }
        }
        Value::Array(arr) => {
            for item in arr.iter_mut() {
                redact_pii(item);
            }
        }
        Value::Object(obj) => {
            for (_, val) in obj.iter_mut() {
                redact_pii(val);
            }
        }
        _ => {}
    }
}

pub fn redact_log(log: &mut crate::events::McpLog) {
    redact_pii(&mut log.payload);
}

