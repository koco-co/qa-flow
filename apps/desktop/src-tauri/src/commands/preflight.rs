use crate::preflight::{check, PreflightStatus};

#[tauri::command]
pub fn get_preflight_status() -> PreflightStatus {
    check()
}

#[tauri::command]
pub fn recheck() -> PreflightStatus {
    check()
}
