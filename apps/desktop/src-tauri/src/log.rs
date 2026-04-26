use anyhow::Result;
use std::fs::{File, OpenOptions};
use std::io::{BufWriter, Write};
use std::path::{Path, PathBuf};
use tokio::sync::Mutex;

pub struct TaskLog {
    pub path: PathBuf,
    writer: Mutex<Option<BufWriter<File>>>,
}

impl TaskLog {
    pub fn open(path: PathBuf) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)?;
        Ok(Self {
            path,
            writer: Mutex::new(Some(BufWriter::new(file))),
        })
    }

    pub async fn append_line(&self, line: &str) -> Result<()> {
        let mut guard = self.writer.lock().await;
        if let Some(w) = guard.as_mut() {
            w.write_all(line.as_bytes())?;
            if !line.ends_with('\n') {
                w.write_all(b"\n")?;
            }
            w.flush()?;
        }
        Ok(())
    }

    pub async fn close(&self) -> Result<()> {
        let mut guard = self.writer.lock().await;
        guard.take(); // drops the BufWriter, flushes on drop
        Ok(())
    }

    pub fn size_bytes(path: &Path) -> u64 {
        std::fs::metadata(path).map(|m| m.len()).unwrap_or(0)
    }
}

pub const MAX_LOG_SIZE_BYTES: u64 = 50 * 1024 * 1024;

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn append_and_read_back() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("task.jsonl");
        let log = TaskLog::open(path.clone()).unwrap();
        log.append_line(r#"{"type":"x"}"#).await.unwrap();
        log.append_line(r#"{"type":"y"}"#).await.unwrap();
        log.close().await.unwrap();
        let contents = std::fs::read_to_string(&path).unwrap();
        assert_eq!(contents, "{\"type\":\"x\"}\n{\"type\":\"y\"}\n");
    }

    #[tokio::test]
    async fn size_bytes_reflects_content() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("size.jsonl");
        let log = TaskLog::open(path.clone()).unwrap();
        log.append_line("hello").await.unwrap();
        log.close().await.unwrap();
        assert_eq!(TaskLog::size_bytes(&path), 6); // "hello\n"
    }
}
