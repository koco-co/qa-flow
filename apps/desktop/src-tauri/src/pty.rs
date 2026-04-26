use anyhow::{anyhow, Result};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex, RwLock};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PtyState {
    NotSpawned,
    Spawning,
    Idle,
    Active,
    Closed,
}

pub struct PtyHandle {
    pub project: String,
    pub state: RwLock<PtyState>,
    pub stdin: Mutex<Option<Box<dyn std::io::Write + Send>>>,
    pub session_id: RwLock<Option<String>>,
    pub child_killer: Mutex<Option<Box<dyn portable_pty::ChildKiller + Send + Sync>>>,
}

impl PtyHandle {
    pub fn new(project: String) -> Arc<Self> {
        Arc::new(Self {
            project,
            state: RwLock::new(PtyState::NotSpawned),
            stdin: Mutex::new(None),
            session_id: RwLock::new(None),
            child_killer: Mutex::new(None),
        })
    }

    pub async fn write_input(&self, text: &str) -> Result<()> {
        let mut guard = self.stdin.lock().await;
        let stdin = guard.as_mut().ok_or_else(|| anyhow!("PTY stdin not available"))?;
        stdin.write_all(text.as_bytes())?;
        if !text.ends_with('\n') {
            stdin.write_all(b"\n")?;
        }
        stdin.flush()?;
        Ok(())
    }

    pub async fn kill(&self) -> Result<()> {
        let mut guard = self.child_killer.lock().await;
        if let Some(killer) = guard.as_mut() {
            let _ = killer.kill();
        }
        *self.state.write().await = PtyState::Closed;
        Ok(())
    }
}

pub struct PtyManager {
    handles: RwLock<HashMap<String, Arc<PtyHandle>>>,
}

impl PtyManager {
    pub fn new() -> Arc<Self> {
        Arc::new(Self { handles: RwLock::new(HashMap::new()) })
    }

    pub async fn get_or_spawn(
        &self,
        project: &str,
        cwd: PathBuf,
        resume_session: Option<&str>,
    ) -> Result<(Arc<PtyHandle>, mpsc::UnboundedReceiver<String>)> {
        {
            let map = self.handles.read().await;
            if let Some(h) = map.get(project) {
                let state = h.state.read().await.clone();
                if state == PtyState::Active {
                    return Err(anyhow!("task already running for project: {project}"));
                }
            }
        }

        let handle = PtyHandle::new(project.to_string());
        *handle.state.write().await = PtyState::Spawning;

        let pair = native_pty_system().openpty(PtySize {
            rows: 40, cols: 120, pixel_width: 0, pixel_height: 0,
        })?;

        let mut cmd = CommandBuilder::new("claude");
        cmd.cwd(&cwd);
        cmd.arg("--output-format=stream-json");
        cmd.arg("--print");
        if let Some(sid) = resume_session {
            cmd.arg("--resume");
            cmd.arg(sid);
        }

        let mut child = pair.slave.spawn_command(cmd)?;
        let killer = child.clone_killer();
        *handle.child_killer.lock().await = Some(killer);

        let stdin = pair.master.take_writer()?;
        *handle.stdin.lock().await = Some(stdin);

        let mut reader = pair.master.try_clone_reader()?;
        let (tx, rx) = mpsc::unbounded_channel::<String>();
        tokio::task::spawn_blocking(move || {
            use std::io::BufRead;
            let mut buf = std::io::BufReader::new(&mut reader);
            let mut line = String::new();
            loop {
                line.clear();
                match buf.read_line(&mut line) {
                    Ok(0) => break,
                    Ok(_) => {
                        if tx.send(line.clone()).is_err() {
                            break; // receiver dropped, stop reading
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        let handle_for_wait = handle.clone();
        tokio::task::spawn_blocking(move || {
            let _ = child.wait();
            let h = handle_for_wait;
            let _ = futures::executor::block_on(async move {
                *h.state.write().await = PtyState::Closed;
            });
        });

        *handle.state.write().await = PtyState::Idle;

        let mut map = self.handles.write().await;
        map.insert(project.to_string(), handle.clone());
        Ok((handle, rx))
    }

    pub async fn get(&self, project: &str) -> Option<Arc<PtyHandle>> {
        self.handles.read().await.get(project).cloned()
    }

    pub async fn kill(&self, project: &str) -> Result<()> {
        if let Some(h) = self.get(project).await {
            h.kill().await?;
        }
        Ok(())
    }

    pub async fn shutdown_all(&self) {
        let map = self.handles.read().await;
        for h in map.values() {
            let _ = h.kill().await;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn pty_handle_starts_in_not_spawned() {
        let h = PtyHandle::new("test".into());
        assert_eq!(*h.state.read().await, PtyState::NotSpawned);
    }

    #[tokio::test]
    async fn pty_manager_get_returns_none_for_unknown() {
        let m = PtyManager::new();
        assert!(m.get("ghost").await.is_none());
    }
}
