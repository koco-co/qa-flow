use kata_workbench_lib::db::{
    create_task, list_recent_tasks, list_sessions, upsert_session, SessionRow, TaskRow,
};

fn make_pool() -> (tempfile::TempDir, kata_workbench_lib::db::DbPool) {
    let dir = tempfile::TempDir::new().unwrap();
    let pool = kata_workbench_lib::db::open_project_pool(&dir.path().join("tasks.db")).unwrap();
    (dir, pool)
}

fn make_task(id: &str, session_id: Option<&str>, started_at: i64) -> TaskRow {
    TaskRow {
        id: id.into(),
        command: "echo hello".into(),
        session_id: session_id.map(|s| s.into()),
        started_at,
        ended_at: None,
        status: "running".into(),
        log_path: "/tmp/log".into(),
        retain_until: None,
        pinned: false,
    }
}

#[test]
fn create_then_list_sessions() {
    let (_dir, pool) = make_pool();

    upsert_session(
        &pool,
        &SessionRow {
            session_id: "s2".into(),
            first_task_id: "t2".into(),
            first_input_summary: Some("second".into()),
            created_at: 200,
            last_active_at: 200,
            task_count: 1,
        },
    )
    .unwrap();

    upsert_session(
        &pool,
        &SessionRow {
            session_id: "s1".into(),
            first_task_id: "t1".into(),
            first_input_summary: Some("first".into()),
            created_at: 100,
            last_active_at: 300,
            task_count: 2,
        },
    )
    .unwrap();

    let list = list_sessions(&pool, 10).unwrap();
    assert_eq!(list[0].session_id, "s1"); // most recent last_active_at first
    assert_eq!(list[1].session_id, "s2");
}

#[test]
fn session_task_count_increments() {
    let (_dir, pool) = make_pool();

    upsert_session(
        &pool,
        &SessionRow {
            session_id: "s1".into(),
            first_task_id: "t1".into(),
            first_input_summary: None,
            created_at: 100,
            last_active_at: 100,
            task_count: 1,
        },
    )
    .unwrap();

    upsert_session(
        &pool,
        &SessionRow {
            session_id: "s1".into(),
            first_task_id: "t1".into(),
            first_input_summary: None,
            created_at: 100,
            last_active_at: 200,
            task_count: 1, // value ignored on conflict; uses task_count + 1
        },
    )
    .unwrap();

    let list = list_sessions(&pool, 10).unwrap();
    assert_eq!(list[0].task_count, 2);
}

#[test]
fn task_belongs_to_session() {
    let (_dir, pool) = make_pool();

    create_task(&pool, &make_task("t1", Some("s1"), 100)).unwrap();
    create_task(&pool, &make_task("t2", Some("s1"), 200)).unwrap();
    create_task(&pool, &make_task("t3", None, 300)).unwrap();

    let all = list_recent_tasks(&pool, 10).unwrap();
    let s1_tasks: Vec<_> = all
        .iter()
        .filter(|t| t.session_id.as_deref() == Some("s1"))
        .collect();
    assert_eq!(s1_tasks.len(), 2);
}
