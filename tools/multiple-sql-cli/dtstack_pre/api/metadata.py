"""元数据同步相关 API — 触发数据源同步、轮询等待完成。"""
from __future__ import annotations

import sys
import time
from typing import Any

from dtstack_pre.api.assets import _ds_name
from dtstack_pre.api.session import DtstackSession


def _get_dmetadata_datasource(
    session: DtstackSession, datasource_name: str
) -> dict[str, Any]:
    """从 dmetadata 系统中查询已注册的数据源，返回含 dataSourceId 和 dataSourceType 的记录。"""
    # type=0 返回所有支持元数据同步的数据源
    result: dict[str, Any] = session.post(
        "/dmetadata/v1/dataSource/listMetadataDataSource", {"type": 0}
    )
    items: list[dict[str, Any]] = result.get("data") or []
    found = next(
        (
            ds
            for ds in items
            if datasource_name.lower()
            in (ds.get("dataSourceName") or "").lower()
        ),
        None,
    )
    if not found:
        raise ValueError(
            f'[preconditions] dmetadata 中未找到数据源 "{datasource_name}"，'
            "请先完成「引入数据资产」步骤"
        )
    return found


def _get_synced_table_count(
    session: DtstackSession, datasource_id: int
) -> int:
    """返回当前数据源在 dmetadata 中已同步的表总数，用于轮询判断同步是否完成。"""
    # 1. 获取该数据源下的所有已同步 database
    db_result: dict[str, Any] = session.post(
        "/dmetadata/v1/dataDb/listSyncedDbsByDataSourceId",
        {"dataSourceId": datasource_id},
    )
    dbs: list[dict[str, Any]] = db_result.get("data") or []
    total = 0
    for db in dbs:
        db_id = db.get("id")
        if not db_id:
            continue
        tbl_result: dict[str, Any] = session.post(
            "/dmetadata/v1/dataTable/listSyncTables",
            {"current": 1, "size": 1, "dataSourceId": datasource_id, "dbId": db_id},
        )
        tbl_data = tbl_result.get("data")
        if isinstance(tbl_data, list):
            total += len(tbl_data)
        elif isinstance(tbl_data, dict):
            total += tbl_data.get("total") or len(tbl_data.get("contentList") or [])
    return total


def _poll_for_tables(
    session: DtstackSession,
    datasource_id: int,
    expected_tables: list[str],
    timeout_seconds: int,
) -> None:
    """触发同步后轮询，直到 expected_tables 中的表全部出现在 dmetadata，或超时。"""
    deadline = time.time() + timeout_seconds
    prev_count = _get_synced_table_count(session, datasource_id)
    print(
        f"[preconditions] 同步前已知表数: {prev_count}，等待同步完成...",
        file=sys.stderr,
    )

    while time.time() < deadline:
        time.sleep(5)
        current_count = _get_synced_table_count(session, datasource_id)
        if current_count != prev_count:
            print(
                f"[preconditions] 同步进行中，当前表数: {current_count}",
                file=sys.stderr,
            )
            prev_count = current_count

        # 如果没有需要确认的具体表名，等待表数稳定即可
        if not expected_tables:
            # 若已有表（表数 > 0），认为同步完成
            if current_count > 0:
                print(
                    f"[preconditions] 元数据同步完成，共 {current_count} 张表",
                    file=sys.stderr,
                )
                return
            continue

        # 检查指定表是否已出现
        db_result: dict[str, Any] = session.post(
            "/dmetadata/v1/dataDb/listSyncedDbsByDataSourceId",
            {"dataSourceId": datasource_id},
        )
        dbs: list[dict[str, Any]] = db_result.get("data") or []
        found_tables: set[str] = set()
        for db in dbs:
            db_id = db.get("id")
            if not db_id:
                continue
            tbl_result: dict[str, Any] = session.post(
                "/dmetadata/v1/dataTable/listSyncTables",
                {
                    "current": 1,
                    "size": 100,
                    "dataSourceId": datasource_id,
                    "dbId": db_id,
                },
            )
            tbl_data = tbl_result.get("data")
            tables: list[dict[str, Any]] = (
                tbl_data if isinstance(tbl_data, list) else []
            )
            found_tables.update(t.get("tableName", "") for t in tables)

        missing = [t for t in expected_tables if t not in found_tables]
        if not missing:
            print(
                f"[preconditions] 元数据同步完成，目标表均已就绪: {expected_tables}",
                file=sys.stderr,
            )
            return
        print(
            f"[preconditions] 等待目标表出现，未就绪: {missing}",
            file=sys.stderr,
        )

    print(
        "[preconditions] 等待元数据同步超时，继续执行测试",
        file=sys.stderr,
    )


def sync_metadata(
    session: DtstackSession,
    sync_config: dict[str, Any],
) -> None:
    """
    在数据资产产品中触发元数据同步，轮询等待完成。

    使用 POST /dmetadata/v1/scheduleJob/syncSourceJob 立即触发同步，
    再轮询 listSyncTables 等待目标表出现。

    sync_config 字段：
        datasourceName  — 已引入数据源名称（必填）
        tables          — 期望同步完成的表名列表（可选，用于精确等待）
        timeoutSeconds  — 轮询超时（秒），默认 180
    """
    datasource_name: str = sync_config.get("datasourceName") or ""
    expected_tables: list[str] = sync_config.get("tables") or []
    timeout_seconds: int = int(sync_config.get("timeoutSeconds") or 180)

    if not datasource_name:
        raise ValueError("[preconditions] sync_config.datasourceName 不能为空")

    # 1. 从 dmetadata 获取数据源信息（含内部 ID 和类型）
    ds_info = _get_dmetadata_datasource(session, datasource_name)
    datasource_id = int(ds_info["dataSourceId"])
    datasource_type = int(ds_info["dataSourceType"])

    print(
        f"[preconditions] 触发元数据同步: {datasource_name} "
        f"(id={datasource_id}, type={datasource_type})",
        file=sys.stderr,
    )

    # 2. 触发立即同步
    sync_result: dict[str, Any] = session.post(
        "/dmetadata/v1/scheduleJob/syncSourceJob",
        {"dataSourceId": datasource_id, "dataSourceType": datasource_type},
    )
    code = sync_result.get("code")
    if code is not None and code != 1:
        raise ValueError(
            f"[preconditions] 触发元数据同步失败 code={code}: "
            f"{sync_result.get('message', '')}"
        )

    print(
        "[preconditions] 同步任务已触发，等待完成...",
        file=sys.stderr,
    )

    # 3. 轮询等待
    _poll_for_tables(session, datasource_id, expected_tables, timeout_seconds)
