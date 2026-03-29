#!/usr/bin/env python3
"""
refresh-lanhu-cookie.py

使用 Playwright 登录蓝湖并刷新 tools/lanhu-mcp/.env 中的 LANHU_COOKIE。

环境变量:
  LANHU_LOGIN_EMAIL       蓝湖登录邮箱（必填）
  LANHU_LOGIN_PASSWORD    蓝湖登录密码（必填）
  LANHU_ENV_FILE          .env 文件路径（可选，默认取自 .claude/config.json）
  LANHU_HEADLESS          是否无头运行（可选，默认 true）
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
CONFIG_PATH = REPO_ROOT / ".claude" / "config.json"
LOGIN_URL = "https://lanhuapp.com/web/#/login"


def load_lanhu_paths() -> tuple[Path, Path]:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    integration = config.get("integrations", {}).get("lanhuMcp")
    if not integration:
        raise RuntimeError("未在 .claude/config.json 中找到 integrations.lanhuMcp 配置")

    runtime_path = integration.get("runtimePath")
    env_file = integration.get("envFile")
    if not runtime_path or not env_file:
        raise RuntimeError("integrations.lanhuMcp 缺少 runtimePath/envFile 配置")

    return (REPO_ROOT / runtime_path).resolve(), (REPO_ROOT / env_file).resolve()


DEFAULT_RUNTIME_PATH, DEFAULT_ENV_FILE = load_lanhu_paths()


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

    if env_path == DEFAULT_ENV_FILE and not DEFAULT_RUNTIME_PATH.exists():
        raise RuntimeError(f"未找到 lanhu-mcp 运行目录：{DEFAULT_RUNTIME_PATH}")

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
