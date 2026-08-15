"""数百人分のEvernoteカルテ移行パイプラインの共通ユーティリティ。

- .env.local (Next.jsアプリと共通) から NOTION_TOKEN / NOTION_DATABASE_ID /
  NOTION_MEMBERS_DATABASE_ID / ANTHROPIC_API_KEY を読み込む
- Notion REST API / Anthropic Messages API への薄いHTTPラッパー
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

import requests

# Windows既定のコンソール文字コード(cp932)では表現できないUnicode文字
# (例: 部首の異体字コードポイントを含む氏名)を含むデータをprintするとクラッシュするため、
# 標準出力/標準エラー出力をUTF-8(未対応文字は置換)に固定する。
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env.local"

NOTION_VERSION = "2022-06-28"
NOTION_API_BASE = "https://api.notion.com/v1"
ANTHROPIC_API_BASE = "https://api.anthropic.com/v1"


def load_env_file(path: Path = ENV_FILE) -> None:
    """.env.local を読み込み、既存の環境変数を上書きしない形でセットする。"""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(
            f"環境変数 {name} が設定されていません。.env.local に追加するか export してください。"
        )
    return value


def notion_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {require_env('NOTION_TOKEN')}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def notion_request(
    method: str, path: str, json_body: dict[str, Any] | None = None, max_retries: int = 5
) -> dict[str, Any]:
    """Notion REST APIを叩く。429はRetry-Afterに従い、それ以外の一時的な接続エラー
    (タイムアウト・接続切断など、数百人規模の連続実行では実際に発生する)も
    指数バックオフでリトライする。
    """
    url = f"{NOTION_API_BASE}{path}"
    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            resp = requests.request(method, url, headers=notion_headers(), json=json_body, timeout=30)
        except requests.exceptions.RequestException as exc:
            last_error = exc
            time.sleep(2 * (attempt + 1))
            continue
        if resp.status_code == 429:
            wait = float(resp.headers.get("Retry-After", "1"))
            time.sleep(wait)
            continue
        if resp.status_code >= 500:
            last_error = RuntimeError(f"Notion API error {resp.status_code} for {method} {path}: {resp.text}")
            time.sleep(2 * (attempt + 1))
            continue
        if not resp.ok:
            raise RuntimeError(f"Notion API error {resp.status_code} for {method} {path}: {resp.text}")
        return resp.json()
    raise RuntimeError(f"Notion APIへのリクエストが{max_retries}回連続で失敗しました for {method} {path}: {last_error}")


def anthropic_messages(
    system: str,
    user_content: str,
    model: str = "claude-haiku-4-5-20251001",
    max_tokens: int = 4096,
    max_retries: int = 5,
) -> str:
    """Anthropic Messages APIを叩き、テキスト応答を返す。"""
    api_key = require_env("ANTHROPIC_API_KEY")
    url = f"{ANTHROPIC_API_BASE}/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": model,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user_content}],
    }
    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            resp = requests.post(url, headers=headers, json=body, timeout=120)
        except requests.exceptions.RequestException as exc:
            last_error = exc
            time.sleep(2 * (attempt + 1))
            continue
        if resp.status_code == 429:
            wait = float(resp.headers.get("retry-after", "2")) if resp.headers.get("retry-after") else 2 * (attempt + 1)
            time.sleep(wait)
            continue
        if resp.status_code >= 500:
            last_error = RuntimeError(f"Anthropic API error {resp.status_code}: {resp.text}")
            time.sleep(2 * (attempt + 1))
            continue
        if not resp.ok:
            raise RuntimeError(f"Anthropic API error {resp.status_code}: {resp.text}")
        data = resp.json()
        parts = data.get("content", [])
        text = "".join(p.get("text", "") for p in parts if p.get("type") == "text")
        return text
    raise RuntimeError(f"Anthropic APIへのリクエストが{max_retries}回連続で失敗しました: {last_error}")


def extract_json_block(text: str) -> Any:
    """モデル応答からJSON部分を取り出してパースする（```json フェンス対応）。"""
    stripped = text.strip()
    fence_match = re.search(r"```(?:json)?\s*(.*?)```", stripped, re.DOTALL)
    if fence_match:
        stripped = fence_match.group(1).strip()
    return json.loads(stripped)


def slugify_person_name(name: str) -> str:
    """人名をファイル/フォルダ名に使える形に変換する（日本語はそのまま許可）。"""
    cleaned = re.sub(r"[\\/:*?\"<>|\s]+", "_", name.strip())
    return cleaned or "unknown"
