pub mod commands;
pub mod db;
pub mod paths;
pub mod preflight;
pub mod projects;
pub mod state;
pub mod log;
pub mod stream;

use tauri::Manager;
#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::preflight::get_preflight_status,
            commands::preflight::recheck,
            commands::projects::list_projects_cmd,
            commands::projects::switch_project_cmd,
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                let window = app.get_webview_window("main").expect("main window missing");
                apply_vibrancy(
                    &window,
                    NSVisualEffectMaterial::UnderWindowBackground,
                    Some(NSVisualEffectState::Active),
                    Some(12.0),
                )
                .expect("vibrancy unsupported on this macOS version");
            }
            let ui_db_path = paths::ui_db_path();
            let ui_db = db::open_pool(&ui_db_path).expect("ui.db open failed");
            let state = state::AppState::new(ui_db);
            app.manage(state);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
