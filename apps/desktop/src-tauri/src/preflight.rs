use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum PreflightStatus {
    Ready { version: String },
    CliMissing,
    NotLoggedIn { version: String },
}

pub fn detect_cli_version() -> Option<String> {
    let output = Command::new("claude").arg("--version").output().ok()?;
    if !output.status.success() {
        return None;
    }
    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if raw.is_empty() { None } else { Some(raw) }
}

pub fn detect_login_state(home: Option<PathBuf>) -> bool {
    let home = match home.or_else(dirs::home_dir) {
        Some(h) => h,
        None => return false,
    };
    let config = home.join(".claude").join("config.json");
    if !config.exists() {
        return false;
    }
    // login is considered established if config.json contains an "oauth" or "apiKey" field
    let contents = std::fs::read_to_string(&config).unwrap_or_default();
    contents.contains("\"oauth\"") || contents.contains("\"apiKey\"")
}

pub fn check() -> PreflightStatus {
    match detect_cli_version() {
        None => PreflightStatus::CliMissing,
        Some(version) => {
            if detect_login_state(None) {
                PreflightStatus::Ready { version }
            } else {
                PreflightStatus::NotLoggedIn { version }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_returns_none_when_command_absent() {
        // Override PATH to empty for this thread/test
        let saved = std::env::var("PATH").ok();
        std::env::set_var("PATH", "");
        let result = detect_cli_version();
        let ok = result.is_none();
        if let Some(v) = saved { std::env::set_var("PATH", v); }
        assert!(ok);
    }

    #[test]
    fn login_state_false_when_no_config() {
        let dir = tempfile::tempdir().unwrap();
        assert!(!detect_login_state(Some(dir.path().to_path_buf())));
    }

    #[test]
    fn login_state_true_when_config_has_oauth() {
        let dir = tempfile::tempdir().unwrap();
        let config_dir = dir.path().join(".claude");
        std::fs::create_dir_all(&config_dir).unwrap();
        std::fs::write(
            config_dir.join("config.json"),
            r#"{"oauth": {"token": "abc"}}"#,
        ).unwrap();
        assert!(detect_login_state(Some(dir.path().to_path_buf())));
    }
}
