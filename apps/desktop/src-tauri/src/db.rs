use anyhow::Result;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use std::path::Path;

pub type DbPool = Pool<SqliteConnectionManager>;

pub fn open_pool(path: &Path) -> Result<DbPool> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let manager = SqliteConnectionManager::file(path);
    let pool = Pool::builder().max_size(8).build(manager)?;
    run_migrations(&pool)?;
    Ok(pool)
}

pub fn run_migrations(pool: &DbPool) -> Result<()> {
    let conn = pool.get()?;
    conn.execute_batch(include_str!("db/migrations/0001_init.sql"))?;
    Ok(())
}

pub fn open_project_pool(path: &Path) -> Result<DbPool> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let manager = SqliteConnectionManager::file(path);
    let pool = Pool::builder().max_size(4).build(manager)?;
    let conn = pool.get()?;
    conn.execute_batch(include_str!("db/migrations/0001_tasks.sql"))?;
    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn migrations_run_idempotently() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("ui.db");
        let pool = open_pool(&db_path).unwrap();
        run_migrations(&pool).unwrap(); // second run = no-op
        let conn = pool.get().unwrap();
        let count: i64 = conn
            .query_row("SELECT count(*) FROM projects", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn project_pool_creates_tasks_schema() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("tasks.db");
        let pool = open_project_pool(&db_path).unwrap();
        let conn = pool.get().unwrap();
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap()
            .query_map([], |r| r.get::<_, String>(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();
        assert!(tables.contains(&"tasks".to_string()));
        assert!(tables.contains(&"sessions".to_string()));
    }
}
