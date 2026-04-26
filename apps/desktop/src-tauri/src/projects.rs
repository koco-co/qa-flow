use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProjectInfo {
    pub name: String,
    pub display_name: Option<String>,
    pub path: PathBuf,
}

pub fn scan(workspace_root: &Path) -> Result<Vec<ProjectInfo>> {
    if !workspace_root.exists() {
        return Ok(Vec::new());
    }
    let mut projects = Vec::new();
    for entry in std::fs::read_dir(workspace_root)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        if !metadata.is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        projects.push(ProjectInfo {
            name: name.clone(),
            display_name: None,
            path: entry.path(),
        });
    }
    projects.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(projects)
}

#[derive(Debug, Clone, Default)]
pub struct ProjectMetadata {
    pub display_name: Option<String>,
    pub raw: Option<String>,
}

pub fn load_metadata(config_path: &Path) -> Result<HashMap<String, ProjectMetadata>> {
    if !config_path.exists() {
        return Ok(HashMap::new());
    }
    let raw = std::fs::read_to_string(config_path)?;
    let json: serde_json::Value = serde_json::from_str(&raw)?;
    let projects = json.get("projects").and_then(|v| v.as_object());
    let mut out = HashMap::new();
    if let Some(map) = projects {
        for (name, value) in map.iter() {
            let display_name = value
                .get("displayName")
                .and_then(|v| v.as_str())
                .map(String::from);
            out.insert(
                name.clone(),
                ProjectMetadata {
                    display_name,
                    raw: Some(value.to_string()),
                },
            );
        }
    }
    Ok(out)
}

pub fn scan_with_metadata(
    workspace_root: &Path,
    config_path: &Path,
) -> Result<Vec<ProjectInfo>> {
    let mut projects = scan(workspace_root)?;
    let metadata = load_metadata(config_path)?;
    for p in &mut projects {
        if let Some(meta) = metadata.get(&p.name) {
            p.display_name = meta.display_name.clone();
        }
    }
    Ok(projects)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn scan_empty_workspace_returns_empty_list() {
        let dir = tempdir().unwrap();
        assert!(scan(dir.path()).unwrap().is_empty());
    }

    #[test]
    fn scan_lists_project_subdirs() {
        let dir = tempdir().unwrap();
        std::fs::create_dir(dir.path().join("foo")).unwrap();
        std::fs::create_dir(dir.path().join("bar")).unwrap();
        let projects = scan(dir.path()).unwrap();
        assert_eq!(projects.len(), 2);
        assert_eq!(projects[0].name, "bar");
        assert_eq!(projects[1].name, "foo");
    }

    #[test]
    fn scan_skips_dotfiles_and_files() {
        let dir = tempdir().unwrap();
        std::fs::create_dir(dir.path().join(".kata")).unwrap();
        std::fs::write(dir.path().join("README.md"), "x").unwrap();
        std::fs::create_dir(dir.path().join("real")).unwrap();
        let projects = scan(dir.path()).unwrap();
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].name, "real");
    }

    #[test]
    fn load_metadata_returns_empty_when_file_absent() {
        let dir = tempdir().unwrap();
        let metadata = load_metadata(&dir.path().join("nope.json")).unwrap();
        assert!(metadata.is_empty());
    }

    #[test]
    fn load_metadata_extracts_displayName() {
        let dir = tempdir().unwrap();
        let cfg = dir.path().join("config.json");
        std::fs::write(&cfg, r#"{"projects": {"foo": {"displayName": "Foo Project"}}}"#).unwrap();
        let metadata = load_metadata(&cfg).unwrap();
        assert_eq!(
            metadata.get("foo").unwrap().display_name.as_deref(),
            Some("Foo Project")
        );
    }

    #[test]
    fn scan_with_metadata_merges_displayName() {
        let dir = tempdir().unwrap();
        std::fs::create_dir(dir.path().join("foo")).unwrap();
        let cfg = dir.path().join("config.json");
        std::fs::write(&cfg, r#"{"projects": {"foo": {"displayName": "Foo"}}}"#).unwrap();
        let projects = scan_with_metadata(dir.path(), &cfg).unwrap();
        assert_eq!(projects[0].display_name.as_deref(), Some("Foo"));
    }
}
