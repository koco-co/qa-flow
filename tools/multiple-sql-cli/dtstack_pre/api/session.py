"""Base HTTP session — wraps requests.Session with cookie header."""
from __future__ import annotations

import sys
from typing import Any

import requests


class DtstackSession:
    """Thin wrapper around requests.Session that injects cookie and common headers."""

    def __init__(self, base_url: str, cookie: str) -> None:
        self.base_url = base_url.rstrip("/")
        self._session = requests.Session()
        self._session.headers.update(
            {
                "content-type": "application/json;charset=UTF-8",
                "Accept-Language": "zh-CN",
                "cookie": cookie,
            }
        )

    def post(self, path: str, body: dict[str, Any], extra_headers: dict[str, str] | None = None) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        print(f"[session] POST {url}", file=sys.stderr)
        headers = dict(extra_headers) if extra_headers else None
        resp = self._session.post(url, json=body, timeout=30, headers=headers)
        resp.raise_for_status()
        return resp.json()  # type: ignore[no-any-return]

    def get(self, path: str, extra_headers: dict[str, str] | None = None) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        print(f"[session] GET {url}", file=sys.stderr)
        headers = dict(extra_headers) if extra_headers else None
        resp = self._session.get(url, timeout=30, headers=headers)
        resp.raise_for_status()
        return resp.json()  # type: ignore[no-any-return]
