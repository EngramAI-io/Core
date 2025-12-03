use std::panic;

pub fn install_panic_hook() {
    panic::set_hook(Box::new(|info| {
        eprintln!("Sentinel panic occurred:");
        eprintln!("{}", info);

        // Try to restore config backup
        if let Err(e) = crate::config::restore_backup() {
            eprintln!("Warning: Failed to restore config backup: {}", e);
        }

        // Log panic to file
        let panic_log = format!(
            "Panic at {:?}\n{:?}\n",
            std::time::SystemTime::now(),
            info
        );

        if let Err(e) = std::fs::write("sentinel_panic.log", panic_log) {
            eprintln!("Warning: Failed to write panic log: {}", e);
        }
    }));
}

