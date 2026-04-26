use crate::db::DbPool;
use crate::pty::PtyManager;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct AppState {
    pub ui_db: DbPool,
    pub project_dbs: RwLock<HashMap<String, DbPool>>,
    pub current_project: RwLock<Option<String>>,
    pub pty_manager: Arc<PtyManager>,
}

impl AppState {
    pub fn new(ui_db: DbPool) -> Arc<Self> {
        Arc::new(Self {
            ui_db,
            project_dbs: RwLock::new(HashMap::new()),
            current_project: RwLock::new(None),
            pty_manager: PtyManager::new(),
        })
    }

    pub async fn project_db(&self, project: &str) -> anyhow::Result<DbPool> {
        {
            let map = self.project_dbs.read().await;
            if let Some(p) = map.get(project) {
                return Ok(p.clone());
            }
        }
        let path = crate::paths::project_db_path(project);
        let pool = crate::db::open_project_pool(&path)?;
        let mut map = self.project_dbs.write().await;
        map.insert(project.to_string(), pool.clone());
        Ok(pool)
    }
}
