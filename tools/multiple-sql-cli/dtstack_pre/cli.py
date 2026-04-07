#!/usr/bin/env python3
"""
DTStack 前置条件 CLI

用法：
    echo '<JSON>' | dtstack-pre setup --base-url http://172.16.124.78

Cookie 通过环境变量 DTSTACK_COOKIE 传入（避免 shell 引号问题）。

stdin JSON 格式（SetupConfig）：
    {
      "sqls": ["CREATE TABLE ..."],
      "batch": { "batchProject": "env_rebuild_test", "datasourceType": "Doris" },
      "import": { "datasourceName": "ci78_doris_auto" },
      "sync":   { "datasourceName": "ci78_doris_auto", "timeoutSeconds": 180 },
      "steps":  { "createTables": true, "importDatasource": true, "syncMetadata": true }
    }

stdout JSON 格式：
    成功: { "success": true, "steps": { "createTables": "done", ... } }
    失败: { "success": false, "error": "...", "step": "createTables" }
"""
from __future__ import annotations

import json
import sys

import click

from dtstack_pre.api.assets import import_datasource
from dtstack_pre.api.batch import create_tables
from dtstack_pre.api.metadata import sync_metadata
from dtstack_pre.api.session import DtstackSession


@click.group()
def cli() -> None:
    """DTStack 平台前置条件 CLI — 离线建表 / 数据资产引入 / 元数据同步。"""


@cli.command()
@click.option(
    "--base-url",
    required=True,
    envvar="DTSTACK_BASE_URL",
    help="平台根 URL，如 http://172.16.124.78",
)
@click.option(
    "--cookie",
    required=True,
    envvar="DTSTACK_COOKIE",
    help="完整的 cookie 字符串（通过 DTSTACK_COOKIE 环境变量传入更安全）",
)
def setup(base_url: str, cookie: str) -> None:
    """运行所有前置条件步骤，从 stdin 读取 JSON 配置。"""
    raw = sys.stdin.read().strip()
    if not raw:
        _fail("stdin 为空，请通过管道传入 JSON 配置", "setup")

    try:
        config: dict = json.loads(raw)
    except json.JSONDecodeError as e:
        _fail(f"JSON 配置解析失败: {e}", "setup")

    session = DtstackSession(base_url=base_url, cookie=cookie)

    steps_cfg: dict = config.get("steps") or {}
    do_create = steps_cfg.get("createTables", True)
    do_import = steps_cfg.get("importDatasource", True)
    do_sync = steps_cfg.get("syncMetadata", True)

    sqls: list[str] = config.get("sqls") or []
    batch_config: dict = config.get("batch") or {}
    import_config: dict = config.get("import") or {}
    sync_config: dict = config.get("sync") or {}

    result: dict = {"success": True, "steps": {}}
    current_step = "setup"

    try:
        # ── 步骤 1：离线开发建表 ─────────────────────────────────
        if do_create and sqls:
            current_step = "createTables"
            print(
                f"[preconditions] 开始建表，共 {len(sqls)} 个 SQL 批次",
                file=sys.stderr,
            )
            for i, sql in enumerate(sqls, 1):
                print(
                    f"[preconditions] 执行 DDL [{i}/{len(sqls)}]",
                    file=sys.stderr,
                )
                create_tables(session, sql, batch_config)
            result["steps"]["createTables"] = "done"
            print("[preconditions] ✅ 建表完成", file=sys.stderr)

        # ── 步骤 2：数据资产引入数据源 ───────────────────────────
        if do_import and import_config.get("datasourceName"):
            current_step = "importDatasource"
            print("[preconditions] 开始引入数据源到数据资产...", file=sys.stderr)
            import_datasource(session, import_config)
            result["steps"]["importDatasource"] = "done"
            print("[preconditions] ✅ 数据源引入完成", file=sys.stderr)

        # ── 步骤 3：元数据同步 ───────────────────────────────────
        if do_sync and sync_config.get("datasourceName"):
            current_step = "syncMetadata"
            print("[preconditions] 开始触发元数据同步...", file=sys.stderr)
            sync_metadata(session, sync_config)
            result["steps"]["syncMetadata"] = "done"
            print("[preconditions] ✅ 元数据同步完成", file=sys.stderr)

        print("[preconditions] 🎉 所有前置条件设置完成", file=sys.stderr)
        print(json.dumps(result, ensure_ascii=False))

    except Exception as exc:
        result.update({"success": False, "error": str(exc), "step": current_step})
        print(f"[preconditions] ❌ 步骤 {current_step} 失败: {exc}", file=sys.stderr)
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)


def _fail(msg: str, step: str) -> None:
    result = {"success": False, "error": msg, "step": step}
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(1)


if __name__ == "__main__":
    cli()
