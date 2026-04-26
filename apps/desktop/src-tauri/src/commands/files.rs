use crate::paths::workspace_root;
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Clone, Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

fn safe_join(project: &str, sub: Option<&str>) -> Result<PathBuf, String> {
    let base = workspace_root().join(project);
    let target = match sub {
        Some(s) => base.join(s),
        None => base.clone(),
    };
    let canon_base = base.canonicalize().map_err(|e| e.to_string())?;
    let canon_target = target.canonicalize().map_err(|_| "path not found".to_string())?;
    if !canon_target.starts_with(&canon_base) {
        return Err("path escapes project root".into());
    }
    Ok(canon_target)
}

#[tauri::command]
pub async fn list_files(
    project: String,
    sub: Option<String>,
) -> Result<Vec<FileEntry>, String> {
    let dir = safe_join(&project, sub.as_deref())?;
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut entries = Vec::new();
    for e in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let e = e.map_err(|e| e.to_string())?;
        let metadata = e.metadata().map_err(|e| e.to_string())?;
        let name = e.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        entries.push(FileEntry {
            name,
            path: e.path().to_string_lossy().into_owned(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
        });
    }
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.cmp(&b.name),
    });
    Ok(entries)
}

#[tauri::command]
pub async fn read_file_text(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("file not found".into());
    }
    let max = 5 * 1024 * 1024; // 5MB cap for preview
    let metadata = std::fs::metadata(p).map_err(|e| e.to_string())?;
    if metadata.len() > max {
        return Err(format!(
            "file too large ({} bytes); use system open",
            metadata.len()
        ));
    }
    std::fs::read_to_string(p).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_with_default(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.shell().open(&path, None).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_in_finder(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let parent = Path::new(&path)
        .parent()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or(path.clone());
    app.shell().open(&parent, None).map_err(|e| e.to_string())
}
