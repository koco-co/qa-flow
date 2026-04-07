# dtstack-preconditions

DTStack 平台前置条件 CLI，由 `uv` 管理 Python 环境。

封装了跨产品的前置条件操作：
- 🏗️ **离线建表** — 通过 Batch DDL API 在指定项目/数据源下建表
- 📥 **引入数据源** — 将数据源中心的数据源引入到数据资产产品
- 🔄 **元数据同步** — 创建并触发元数据同步任务，轮询等待完成

## 安装

```bash
cd tools/dtstack-preconditions
uv sync
```

## 用法

```bash
# 设置 cookie（通过环境变量，避免 shell 引号问题）
export DTSTACK_COOKIE="SESSION=xxx; JSESSIONID=yyy"

# 一键执行所有前置条件（JSON 配置从 stdin 读取）
echo '{
  "sqls": ["CREATE TABLE test_t1 (id BIGINT) ..."],
  "batch": { "batchProject": "env_rebuild_test", "datasourceType": "Doris" },
  "import": { "datasourceName": "ci78_doris_auto" },
  "sync":   { "datasourceName": "ci78_doris_auto", "timeoutSeconds": 180 }
}' | uv run dtstack-pre setup --base-url http://172.16.124.78
```

## 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `--base-url` | CLI arg / `DTSTACK_BASE_URL` env | 平台根 URL |
| `--cookie` | `DTSTACK_COOKIE` env（推荐）| 完整 cookie 字符串 |

## JSON 配置字段

```json
{
  "sqls": ["..."],                          // DDL SQL 列表（按顺序执行）
  "batch": {
    "batchProject": "env_rebuild_test",    // 离线开发项目名
    "datasourceType": "Doris",             // 数据源类型
    "schema": null                          // 目标 schema（可选）
  },
  "import": {
    "datasourceName": "ci78_doris_auto",   // 数据资产数据源名
    "forceImport": false                   // 是否强制重新引入
  },
  "sync": {
    "datasourceName": "ci78_doris_auto",
    "database": null,                      // 指定 database（可选）
    "timeoutSeconds": 180
  },
  "steps": {
    "createTables": true,
    "importDatasource": true,
    "syncMetadata": true
  }
}
```

## 输出

成功：
```json
{ "success": true, "steps": { "createTables": "done", "importDatasource": "done", "syncMetadata": "done" } }
```

失败：
```json
{ "success": false, "error": "...", "step": "createTables" }
```

进度日志输出到 stderr，JSON 结果输出到 stdout。

## 从 TS 调用

使用 `plugins/dtstack-preconditions/preconditions.ts`，该文件自动完成 cookie 提取和 CLI 调用。
