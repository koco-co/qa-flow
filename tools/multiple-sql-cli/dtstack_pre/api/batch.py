"""离线开发（Batch）相关 API — 项目查询、数据源查询、DDL 建表。"""
from __future__ import annotations

import base64
import sys
from typing import Any

from dtstack_pre.api.session import DtstackSession


def get_batch_project_id(session: DtstackSession, project_name: str) -> int:
    """查询离线开发项目列表，按名称匹配返回 projectId。"""
    result: dict[str, Any] = session.post("/api/rdos/common/project/getProjects", {})
    projects: list[dict[str, Any]] = result.get("data") or []

    for p in projects:
        name: str = (
            p.get("name") or p.get("projectName") or p.get("projectAlias") or ""
        )
        if project_name.lower() in name.lower():
            pid = p.get("projectId") or p.get("id")
            if pid is not None:
                return int(pid)

    raise ValueError(
        f'[preconditions] 离线开发项目 "{project_name}" 未找到，'
        f"共查询到 {len(projects)} 个项目"
    )


def get_batch_datasource(
    session: DtstackSession,
    project_id: int,
    datasource_type: str,
) -> dict[str, Any]:
    """查询离线开发项目下的数据源列表，按类型匹配返回 {sourceId, schema}。

    匹配规则（优先级从高到低）：
      1. identity 字段完全匹配（如 "doris"）
      2. dataName 字段中包含 type 关键词（如 "DORIS"）
      3. dataSourceType 字段字符串匹配（兼容旧 API 格式）
    """
    result: dict[str, Any] = session.post(
        "/api/rdos/batch/batchDataSource/list",
        {"projectId": project_id, "syncTask": True},
    )
    datasources: list[dict[str, Any]] = result.get("data") or []
    type_str = datasource_type.lower()

    def _match(ds: dict[str, Any]) -> bool:
        identity = (ds.get("identity") or "").lower()
        data_name = (ds.get("dataName") or ds.get("name") or "").lower()
        ds_type_str = (ds.get("dataSourceType") or "").lower()
        return (
            identity == type_str
            or type_str in data_name
            or (ds_type_str and (type_str in ds_type_str or ds_type_str in type_str))
        )

    for ds in datasources:
        if _match(ds):
            source_id = ds.get("id") or ds.get("sourceId")
            if source_id is not None:
                schema: str = (
                    ds.get("schemaName")
                    or ds.get("schema")
                    or _extract_schema_from_jdbc(ds.get("dataJson") or {})
                    or ""
                )
                return {"sourceId": int(source_id), "schema": schema}

    raise ValueError(
        f'[preconditions] 项目({project_id})中未找到类型为 "{datasource_type}" 的数据源，'
        f"共查询到 {len(datasources)} 个数据源"
    )


def _extract_schema_from_jdbc(data_json: dict[str, Any]) -> str:
    """尝试从 jdbcUrl 中提取默认 schema/database 名称。"""
    jdbc_url: str = data_json.get("jdbcUrl") or ""
    try:
        after_host = jdbc_url.split("//", 1)[-1] if "//" in jdbc_url else ""
        path_part = after_host.split("?")[0]
        if "/" in path_part:
            schema = path_part.rsplit("/", 1)[-1]
            if schema and schema not in ("", "?"):
                return schema
    except Exception:
        pass
    return ""


def create_tables(
    session: DtstackSession,
    ddl_sql: str,
    batch_config: dict[str, Any],
) -> None:
    """
    通过离线开发 batchTableInfo API 执行 DDL 建表。

    batch_config 字段：
        batchProject   — 项目名称（默认 "env_rebuild_test"）
        datasourceType — 数据源类型（默认 "Doris"）
        schema         — 目标 schema，若不传则使用数据源默认 schema
    """
    project_name: str = batch_config.get("batchProject") or "env_rebuild_test"
    ds_type: str = batch_config.get("datasourceType") or "Doris"
    schema_override: str | None = batch_config.get("schema")

    project_id = get_batch_project_id(session, project_name)
    ds_info = get_batch_datasource(session, project_id, ds_type)

    schema: str = schema_override or ds_info["schema"] or ""
    sql_b64: str = base64.b64encode(ddl_sql.encode("utf-8")).decode("ascii")

    result: dict[str, Any] = session.post(
        "/api/rdos/batch/batchTableInfo/ddlCreateTableEncryption",
        {
            "sql": sql_b64,
            "sourceId": str(ds_info["sourceId"]),
            "targetSchema": schema,
            "syncTask": True,
        },
        extra_headers={"X-Project-Id": str(project_id)},
    )

    code = result.get("code")
    if code is not None and code != 1:
        print(
            f"[preconditions] 建表 API 返回非成功状态 code={code}: "
            f"{result.get('message', '')}",
            file=sys.stderr,
        )

    print(
        f"[preconditions] 建表完成 project={project_name} "
        f"sourceId={ds_info['sourceId']} schema={schema}",
        file=sys.stderr,
    )

