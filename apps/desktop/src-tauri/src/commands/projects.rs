use crate::db::{list_projects, touch_project_active, upsert_project, ProjectRow};
use crate::paths::{config_json_path, workspace_root};
use crate::projects::scan_with_metadata;
use crate::state::AppState;
use serde::Serialize;
use std::sync::Arc;
use tauri::State;

#[derive(Debug, Clone, Serialize)]
pub struct ProjectDto {
    pub name: String,
    pub display_name: Option<String>,
    pub path: String,
    pub last_active_at: Option<i64>,
}

#[tauri::command]
pub async fn list_projects_cmd(state: State<'_, Arc<AppState>>) -> Result<Vec<ProjectDto>, String> {
    let scanned = scan_with_metadata(&workspace_root(), &config_json_path())
        .map_err(|e| e.to_string())?;
    for info in &scanned {
        upsert_project(&state.ui_db, &ProjectRow {
            name: info.name.clone(),
            display_name: info.display_name.clone(),
            path: info.path.to_string_lossy().into_owned(),
            last_active_at: None,
            metadata: None,
        }).map_err(|e| e.to_string())?;
    }
    let rows = list_projects(&state.ui_db).map_err(|e| e.to_string())?;
    Ok(rows.into_iter().map(|r| ProjectDto {
        name: r.name,
        display_name: r.display_name,
        path: r.path,
        last_active_at: r.last_active_at,
    }).collect())
}

#[tauri::command]
pub async fn switch_project_cmd(
    state: State<'_, Arc<AppState>>,
    name: String,
) -> Result<(), String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64;
    touch_project_active(&state.ui_db, &name, now).map_err(|e| e.to_string())?;
    *state.current_project.write().await = Some(name);
    Ok(())
}
