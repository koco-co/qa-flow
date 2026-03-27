#!/usr/bin/env python3
"""
refresh-lanhu-cookie.py

使用 Playwright 登录蓝湖并刷新 vendor/lanhu-mcp/.env 中的 LANHU_COOKIE。

环境变量:
  LANHU_LOGIN_EMAIL       蓝湖登录邮箱（必填）
  LANHU_LOGIN_PASSWORD    蓝湖登录密码（必填）
  LANHU_ENV_FILE          .env 文件路径（可选，默认 vendor/lanhu-mcp/.env）
  LANHU_HEADLESS          是否无头运行（可选，默认 true）
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

from playwright.async_api import async_playwright


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
DEFAULT_ENV_FILE = REPO_ROOT / "vendor" / "lanhu-mcp" / ".env"
LOGIN_URL = "https://lanhuapp.com/web/#/login"


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"缺少环境变量：{name}")
    return value


def load_env_lines(env_path: Path) -> list[str]:
    if env_path.exists():
        return env_path.read_text(encoding="utf-8").splitlines()
    return []


def upsert_env_var(lines: list[str], key: str, value: str) -> list[str]:
    updated = []
    replaced = False
    for line in lines:
      if line.startswith(f"{key}="):
          updated.append(f'{key}="{value}"')
          replaced = True
      else:
          updated.append(line)
    if not replaced:
        updated.append(f'{key}="{value}"')
    return updated


def write_cookie(env_path: Path, cookie_value: str) -> None:
    env_path.parent.mkdir(parents=True, exist_ok=True)
    lines = load_env_lines(env_path)
    lines = upsert_env_var(lines, "LANHU_COOKIE", cookie_value)
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


async def refresh_cookie() -> None:
    login_email = require_env("LANHU_LOGIN_EMAIL")
    login_password = require_env("LANHU_LOGIN_PASSWORD")
    env_path = Path(os.getenv("LANHU_ENV_FILE", str(DEFAULT_ENV_FILE))).expanduser().resolve()
    headless = os.getenv("LANHU_HEADLESS", "true").lower() != "false"

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=headless)
        context = await browser.new_context()
        page = await context.new_page()

        await page.goto(LOGIN_URL, wait_until="networkidle", timeout=30_000)
        await page.fill('input[type="text"]', login_email)
        await page.click(".canClick.loginButton")
        await page.wait_for_timeout(2_000)
        await page.click("div.sure")
        await page.wait_for_timeout(2_000)
        await page.fill('input[type="password"]', login_password)

        for button in await page.locator("div.canClick").all():
            if await button.is_visible() and "登录" in await button.inner_text():
                await button.click()
                break

        await page.wait_for_timeout(5_000)
        cookies = await context.cookies(["https://lanhuapp.com"])
        lanhu_cookie = "; ".join(
            f'{cookie["name"]}={cookie["value"]}'
            for cookie in cookies
            if "lanhuapp" in cookie.get("domain", "")
        )
        if not lanhu_cookie:
            raise RuntimeError("未提取到 lanhuapp Cookie，请检查登录流程是否变化")

        write_cookie(env_path, lanhu_cookie)
        print(f"Cookie refreshed -> {env_path}")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(refresh_cookie())
