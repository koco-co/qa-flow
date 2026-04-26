use serde::{Deserialize, Serialize};
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
}
