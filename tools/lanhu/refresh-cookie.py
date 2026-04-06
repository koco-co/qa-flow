#!/usr/bin/env python3
"""
Refresh Lanhu cookie by logging in via Playwright headless browser.

Credential resolution order:
  1. --username / --password CLI args
  2. LANHU_USERNAME / LANHU_PASSWORD env vars
  3. Interactive prompt (stdin)

After login, navigates to --target-url (if provided) to acquire
project-scoped cookies, then outputs the cookie string to stdout.

Optionally updates .env file in-place with --update-env <path>.

Usage:
  uv run python refresh-cookie.py [--target-url URL] [--update-env .env]
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import json
import os
import re
import sys
from pathlib import Path


def _emit_error(message: str, code: str) -> None:
    payload = {"error": message, "code": code}
    sys.stderr.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.exit(1)


def _resolve_credentials(args: argparse.Namespace) -> tuple[str, str]:
    username = args.username or os.getenv("LANHU_USERNAME", "")
    password = args.password or os.getenv("LANHU_PASSWORD", "")

    if username and password:
        return username, password

    # Interactive fallback
    if not sys.stdin.isatty():
        _emit_error(
            "No credentials available. Set LANHU_USERNAME/LANHU_PASSWORD in .env "
            "or run interactively.",
            "NO_CREDENTIALS",
        )

    print("蓝湖登录凭据未配置，请手动输入：", file=sys.stderr)
    if not username:
        username = input("  邮箱/手机号: ").strip()
    if not password:
        password = getpass.getpass("  密码: ").strip()

    if not username or not password:
        _emit_error("Username and password are required.", "NO_CREDENTIALS")

    return username, password


async def _login_and_get_cookie(
    username: str,
    password: str,
    target_url: str | None,
) -> str:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        _emit_error(
            "playwright is not installed. Run: uv pip install playwright && uv run playwright install chromium",
            "MISSING_PLAYWRIGHT",
        )

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 800})

        # Step 1: Navigate to login page
        await page.goto(
            "https://lanhuapp.com/web/#/user/login",
            wait_until="networkidle",
            timeout=30000,
        )
        await page.wait_for_timeout(2000)

        # Step 2: Enter username
        await page.fill('input[name="username"]', username)
        await page.wait_for_timeout(500)

        # Step 3: Click "登录 / 注册"
        await page.evaluate(
            """() => {
            const divs = document.querySelectorAll('div');
            for (const d of divs) {
                if (d.textContent.trim() === '登录 / 注册' && d.children.length === 0) {
                    d.click(); return true;
                }
            }
            return false;
        }"""
        )
        await page.wait_for_timeout(2000)

        # Step 4: Handle agreement dialog (click "同意" if present)
        await page.evaluate(
            """() => {
            const els = document.querySelectorAll('div, button, span');
            for (const el of els) {
                if (el.textContent.trim() === '同意' && el.children.length === 0) {
                    el.click(); return true;
                }
            }
            return false;
        }"""
        )
        await page.wait_for_timeout(3000)

        # Step 5: Enter password
        pwd_input = await page.query_selector('input[type="password"]')
        if not pwd_input:
            await browser.close()
            _emit_error(
                "Login flow error: password input not found after entering username.",
                "LOGIN_FLOW_ERROR",
            )

        await pwd_input.fill(password)
        await page.wait_for_timeout(500)

        # Step 6: Click login button
        await page.evaluate(
            """() => {
            const els = document.querySelectorAll('div, button');
            for (const el of els) {
                if (el.textContent.trim() === '登录' && el.children.length === 0) {
                    el.click(); return true;
                }
            }
            return false;
        }"""
        )
        await page.wait_for_timeout(5000)

        # Verify login succeeded
        cookies = await page.context.cookies()
        has_token = any(
            c["name"] == "user_token" and c["value"] not in ("undefined", "")
            for c in cookies
        )
        if not has_token:
            await page.screenshot(path="/tmp/lanhu-login-failed.png")
            await browser.close()
            _emit_error(
                "Login failed: user_token not found after login. "
                "Check username/password. Screenshot saved to /tmp/lanhu-login-failed.png",
                "LOGIN_FAILED",
            )

        # Step 7: Navigate to target URL to get project-scoped cookies
        if target_url:
            await page.goto(target_url, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(3000)

        # Step 8: Collect cookies
        cookies = await page.context.cookies()
        cookie_str = "; ".join(f'{c["name"]}={c["value"]}' for c in cookies)

        await browser.close()
        return cookie_str


def _update_env_file(env_path: str, new_cookie: str) -> None:
    path = Path(env_path)
    if not path.exists():
        _emit_error(f".env file not found: {env_path}", "ENV_NOT_FOUND")

    content = path.read_text(encoding="utf-8")

    pattern = re.compile(r"^LANHU_COOKIE=.*$", re.MULTILINE)
    if pattern.search(content):
        updated = pattern.sub(f"LANHU_COOKIE={new_cookie}", content)
    else:
        updated = content.rstrip("\n") + f"\nLANHU_COOKIE={new_cookie}\n"

    path.write_text(updated, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Refresh Lanhu cookie via login")
    parser.add_argument("--username", default=None, help="Lanhu username (email/phone)")
    parser.add_argument("--password", default=None, help="Lanhu password")
    parser.add_argument(
        "--target-url",
        default=None,
        help="Navigate to this URL after login to get project-scoped cookies",
    )
    parser.add_argument(
        "--update-env",
        default=None,
        help="Path to .env file to update with new cookie",
    )
    args = parser.parse_args()

    username, password = _resolve_credentials(args)

    print(f"正在登录蓝湖 ({username})...", file=sys.stderr)

    cookie = asyncio.run(_login_and_get_cookie(username, password, args.target_url))

    if args.update_env:
        _update_env_file(args.update_env, cookie)
        print(f"已更新 {args.update_env} 中的 LANHU_COOKIE", file=sys.stderr)

    # Output cookie to stdout
    sys.stdout.write(cookie)


if __name__ == "__main__":
    main()
