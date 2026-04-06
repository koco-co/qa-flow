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
import re
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
    parser.add_argument(
        "--page-names",
        default=None,
        help="Comma-separated substrings to filter pages by name (e.g. '15525,15529').",
    )
    parser.add_argument(
        "--list-pages",
        action="store_true",
        default=False,
        help="Only list pages without analysis. Outputs lightweight page list JSON.",
    )
    return parser.parse_args()


def _extract_requirement_id(name: str) -> str | None:
    """Extract leading number from page name as requirement ID."""
    match = re.match(r"^(\d+)", name)
    return match.group(1) if match else None


def _find_screenshots_for_pages(pages: list[dict]) -> dict[str, list[str]]:
    """Find screenshot files that match page names in the data directory."""
    data_dir = Path.cwd() / "data"
    if not data_dir.exists():
        return {}

    screenshot_dirs = list(data_dir.glob("axure_extract_*_screenshots"))
    if not screenshot_dirs:
        return {}

    screenshots_dir = screenshot_dirs[0]
    result: dict[str, list[str]] = {}

    for page in pages:
        page_name = page.get("name", "")
        safe_name = re.sub(r'[^\w\s-]', '_', page_name)
        matches = [
            m for m in screenshots_dir.iterdir()
            if m.is_file() and m.stem.startswith(safe_name[:20])
        ]
        # Also try matching by original page name substring in filename
        if not matches:
            matches = [
                m for m in screenshots_dir.iterdir()
                if m.is_file() and page_name[:15] in m.stem
            ]
        if matches:
            result[page_name] = [str(m.resolve()) for m in matches]

    return result


async def _list_pages(url: str) -> dict:
    """Fetch page list only, without analysis."""
    from lanhu_mcp_server import LanhuExtractor

    extractor = LanhuExtractor()
    pages_info = await extractor.get_pages_list(url)
    all_pages: List[dict] = pages_info.get("pages", [])

    return {
        "title": pages_info.get("document_name", ""),
        "doc_type": pages_info.get("document_type", "axure"),
        "total_pages": len(all_pages),
        "pages": [
            {
                "name": p.get("name", ""),
                "path": p.get("path", p.get("name", "")),
                "id": p.get("id", ""),
                "requirement_id": _extract_requirement_id(p.get("name", "")),
            }
            for p in all_pages
        ],
    }


async def _run(url: str, page_id: str | None, page_names_filter: str | None = None) -> dict:
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
    elif page_names_filter is not None:
        filter_terms = [t.strip() for t in page_names_filter.split(",") if t.strip()]
        matching = [
            p for p in all_pages
            if any(term in p.get("name", "") for term in filter_terms)
        ]
        if not matching:
            _emit_error(
                f"No pages matched filters {filter_terms}. "
                f"Available pages: {[p.get('name') for p in all_pages[:20]]}",
                "PAGE_NOT_FOUND",
            )
        target_page_names = [p["name"] for p in matching]
    else:
        target_page_names = "all"

    # 3. Analyze pages in full mode with tester perspective
    from fastmcp.utilities.types import Image

    raw_results = await lanhu_get_ai_analyze_page_result(
        url=url,
        page_names=target_page_names,
        mode="full",
        analysis_mode="tester",
        ctx=None,
    )

    # raw_results is List[Union[str, Image]].
    # Separate text blocks and image paths.
    text_blocks: list[str] = []
    image_paths: list[str] = []
    for item in raw_results:
        if isinstance(item, str):
            text_blocks.append(item)
        elif isinstance(item, Image):
            if item.path:
                abs_path = item.path if item.path.is_absolute() else Path.cwd() / item.path
                if abs_path.exists():
                    image_paths.append(str(abs_path.resolve()))

    combined_text = "\n".join(text_blocks)

    # 4. Build per-page output entries.
    page_entries = _split_content_by_pages(combined_text, all_pages, page_id, page_names_filter)

    # Attach screenshots by matching filenames to page names
    screenshot_map = _find_screenshots_for_pages(page_entries)
    for entry in page_entries:
        matched = screenshot_map.get(entry.get("name", ""), [])
        if matched:
            entry["images"] = matched

    # If screenshot matching found nothing, fall back to inline Image paths
    has_any_matched = any(entry.get("images") for entry in page_entries)
    if not has_any_matched and image_paths and page_entries:
        if len(page_entries) == 1:
            page_entries[0]["images"] = image_paths
        else:
            per_page = max(1, len(image_paths) // len(page_entries))
            for i, entry in enumerate(page_entries):
                start = i * per_page
                end = start + per_page if i < len(page_entries) - 1 else len(image_paths)
                entry["images"] = image_paths[start:end]

    # 5. Determine which pages are in the result set
    if page_id is not None:
        result_pages = [p for p in all_pages if p.get("id") == page_id]
    elif page_names_filter is not None:
        filter_terms = [t.strip() for t in page_names_filter.split(",") if t.strip()]
        result_pages = [
            p for p in all_pages
            if any(term in p.get("name", "") for term in filter_terms)
        ]
    else:
        result_pages = all_pages

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
    page_names_filter: str | None = None,
) -> List[dict]:
    """
    Best-effort split of combined analysis text into per-page entries.

    The server inserts page-name markers like "=== Page: 页面名 ===" or
    "📄 Page X: 页面名". We try to split on those boundaries.
    If splitting fails, we return a single entry with all content.
    """
    if page_id is not None:
        target_pages = [p for p in all_pages if p.get("id") == page_id]
    elif page_names_filter is not None:
        filter_terms = [t.strip() for t in page_names_filter.split(",") if t.strip()]
        target_pages = [
            p for p in all_pages
            if any(term in p.get("name", "") for term in filter_terms)
        ]
    else:
        target_pages = all_pages

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
        if args.list_pages:
            result = asyncio.run(_list_pages(args.url))
        else:
            result = asyncio.run(
                _run(args.url, args.page_id, args.page_names)
            )
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
