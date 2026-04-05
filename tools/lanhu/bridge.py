#!/usr/bin/env python3
"""
Bridge script: imports LanhuExtractor from lanhu-mcp submodule,
fetches PRD page content, and outputs structured JSON to stdout.

Usage (from tools/lanhu/lanhu-mcp directory):
    uv run python ../bridge.py --url <lanhu_url> [--page-id <id>]

Environment:
    LANHU_COOKIE must be set before invocation.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import List


def _emit_error(message: str, code: str) -> None:
    """Write structured error JSON to stderr and exit."""
    payload = {"error": message, "code": code}
    sys.stderr.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.exit(1)


def _validate_env() -> None:
    """Ensure LANHU_COOKIE is present in the environment."""
    cookie = os.getenv("LANHU_COOKIE", "")
    if not cookie or cookie == "your_lanhu_cookie_here":
        _emit_error(
            "LANHU_COOKIE is not set or contains the default placeholder. "
            "Export it before running this script.",
            "MISSING_COOKIE",
        )


def _setup_sys_path() -> None:
    """Add lanhu-mcp directory to sys.path so we can import the server module."""
    bridge_dir = Path(__file__).resolve().parent
    lanhu_mcp_dir = bridge_dir / "lanhu-mcp"
    if not lanhu_mcp_dir.is_dir():
        _emit_error(
            f"lanhu-mcp submodule not found at {lanhu_mcp_dir}",
            "SUBMODULE_MISSING",
        )
    if str(lanhu_mcp_dir) not in sys.path:
        sys.path.insert(0, str(lanhu_mcp_dir))


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch Lanhu PRD page content as structured JSON.",
    )
    parser.add_argument(
        "--url",
        required=True,
        help="Full Lanhu URL (e.g. https://lanhuapp.com/web/#/item/project/product?tid=...&pid=...&docId=...)",
    )
    parser.add_argument(
        "--page-id",
        default=None,
        help="Optional page ID to fetch a single page. Omit to fetch all pages.",
    )
    return parser.parse_args()


async def _run(url: str, page_id: str | None) -> dict:
    """
    Core logic: fetch pages list, then analyze content in text_only mode.

    Returns the structured output dict.
    """
    # Import after sys.path and env are configured (module-level COOKIE read).
    from lanhu_mcp_server import LanhuExtractor, lanhu_get_ai_analyze_page_result

    extractor = LanhuExtractor()

    # 1. Get the full page listing
    pages_info = await extractor.get_pages_list(url)
    all_pages: List[dict] = pages_info.get("pages", [])

    # 2. Determine which pages to analyze
    if page_id is not None:
        matching = [p for p in all_pages if p.get("id") == page_id]
        if not matching:
            _emit_error(
                f"No page found with id '{page_id}'. "
                f"Available ids: {[p.get('id') for p in all_pages[:20]]}",
                "PAGE_NOT_FOUND",
            )
        target_page_names: str | List[str] = [p["name"] for p in matching]
    else:
        target_page_names = "all"

    # 3. Analyze pages in text_only mode with tester perspective
    raw_results = await lanhu_get_ai_analyze_page_result(
        url=url,
        page_names=target_page_names,
        mode="text_only",
        analysis_mode="tester",
        ctx=None,
    )

    # raw_results is List[Union[str, Image]].
    # In text_only mode every element should be a string.
    text_blocks = [item for item in raw_results if isinstance(item, str)]
    combined_text = "\n".join(text_blocks)

    # 4. Build per-page output entries.
    #    The raw text doesn't come pre-split per page in a structured way,
    #    so we attempt to split by page markers the server inserts.
    page_entries = _split_content_by_pages(combined_text, all_pages, page_id)

    # 5. Determine which pages are in the result set
    result_pages = (
        [p for p in all_pages if p.get("id") == page_id]
        if page_id is not None
        else all_pages
    )

    return {
        "title": pages_info.get("document_name", ""),
        "doc_type": pages_info.get("document_type", "axure"),
        "total_pages": len(result_pages),
        "pages": page_entries,
    }


def _split_content_by_pages(
    combined_text: str,
    all_pages: List[dict],
    page_id: str | None,
) -> List[dict]:
    """
    Best-effort split of combined analysis text into per-page entries.

    The server inserts page-name markers like "=== Page: 页面名 ===" or
    "📄 Page X: 页面名". We try to split on those boundaries.
    If splitting fails, we return a single entry with all content.
    """
    import re

    target_pages = (
        [p for p in all_pages if p.get("id") == page_id]
        if page_id is not None
        else all_pages
    )

    # Try splitting by common page header patterns emitted by the server
    # Pattern examples: "📄 Page 1/N: 页面名" or "--- Page: 页面名 ---"
    page_sections = re.split(
        r"(?:📄\s*Page\s*\d+[/\d]*\s*[:：]\s*|[-=]{3,}\s*Page\s*[:：]?\s*)",
        combined_text,
    )

    # If we got meaningful splits that roughly match page count, zip them
    # Filter out empty sections
    page_sections = [s.strip() for s in page_sections if s.strip()]

    if len(page_sections) >= len(target_pages) and len(target_pages) > 0:
        entries = []
        for i, page in enumerate(target_pages):
            section_text = page_sections[i] if i < len(page_sections) else ""
            entries.append({
                "name": page.get("name", ""),
                "path": page.get("path", page.get("name", "")),
                "content": section_text,
                "images": [],
            })
        return entries

    # Fallback: one entry per page, all content in the first entry
    if len(target_pages) == 1:
        page = target_pages[0]
        return [{
            "name": page.get("name", ""),
            "path": page.get("path", page.get("name", "")),
            "content": combined_text,
            "images": [],
        }]

    # Multiple pages but couldn't split — return all pages with shared content
    entries = []
    for i, page in enumerate(target_pages):
        entries.append({
            "name": page.get("name", ""),
            "path": page.get("path", page.get("name", "")),
            "content": combined_text if i == 0 else "",
            "images": [],
        })
    return entries


def main() -> None:
    args = _parse_args()

    _validate_env()
    _setup_sys_path()

    result: dict
    try:
        result = asyncio.run(_run(args.url, args.page_id))
    except ValueError as exc:
        _emit_error(str(exc), "INVALID_URL")
        return
    except Exception as exc:
        _emit_error(str(exc), "FETCH_FAILED")
        return

    # Output structured JSON to stdout
    sys.stdout.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
