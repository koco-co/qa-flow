"""数据资产引入数据源相关 API。"""
from __future__ import annotations

import sys
from typing import Any

from dtstack_pre.api.session import DtstackSession

# 数据资产 pageQuery 用 dataSourceName；listUnusedCenter 用 dtCenterSourceName
_NAME_FIELDS = ("dataSourceName", "dtCenterSourceName", "name")


def _ds_name(ds: dict[str, Any]) -> str:
    for field in _NAME_FIELDS:
        v = ds.get(field)
        if v:
            return str(v)
    return ""


def import_datasource(
    session: DtstackSession,
    import_config: dict[str, Any],
) -> None:
    """
    将数据源引入到数据资产产品。

    import_config 字段：
        datasourceName — 数据源名称（必填）
        forceImport    — 是否跳过"已引入"检查（默认 False）
    """
    datasource_name: str = import_config.get("datasourceName") or ""
    force_import: bool = bool(import_config.get("forceImport"))

    if not datasource_name:
        raise ValueError("[preconditions] import_config.datasourceName 不能为空")

    # 检查是否已引入（避免重复操作）
    if not force_import:
        check_result: dict[str, Any] = session.post(
            "/dassets/v1/dataSource/pageQuery",
            {"current": 1, "size": 10, "search": datasource_name},
        )
        content_list: list[dict[str, Any]] = (
            (check_result.get("data") or {}).get("contentList") or []
        )
        already = any(
            datasource_name.lower() in _ds_name(ds).lower()
            for ds in content_list
        )
        if already:
            print(
                f'[preconditions] 数据源 "{datasource_name}" 已存在于数据资产，跳过引入',
                file=sys.stderr,
            )
            return

    # 获取待引入数据源列表（数据源中心中尚未引入的）
    list_result: dict[str, Any] = session.post(
        "/dassets/v1/dataSource/listUnusedCenterDataSource",
        {"search": datasource_name, "current": 1, "size": 20},
    )
    candidates: list[dict[str, Any]] = (
        (list_result.get("data") or {}).get("contentList") or []
    )

    target = next(
        (
            ds
            for ds in candidates
            if datasource_name.lower() in _ds_name(ds).lower()
        ),
        None,
    )

    if not target or not target.get("dtCenterSourceId"):
        raise ValueError(
            f'[preconditions] 数据源中心中未找到待引入的数据源 "{datasource_name}"，'
            "请确认数据源已在数据源中心创建并授权给资产产品"
        )

    dt_center_source_id = target["dtCenterSourceId"]

    # 检查相似数据源（平台要求，不影响引入流程）
    try:
        session.post(
            "/dassets/v1/dataSource/checkSimilarDatasource",
            {"dtCenterSourceIdList": [dt_center_source_id]},
        )
    except Exception:
        pass

    # 执行引入
    import_result: dict[str, Any] = session.post(
        "/dassets/v1/dataSource/importDataSource",
        {"dtCenterSourceIdList": [dt_center_source_id]},
    )

    if import_result.get("data") is not True:
        raise ValueError(
            f'[preconditions] 数据资产引入数据源失败: '
            f"{import_result.get('message') or str(import_result)}"
        )

    print(
        f'[preconditions] 数据源 "{datasource_name}" 引入数据资产成功',
        file=sys.stderr,
    )
