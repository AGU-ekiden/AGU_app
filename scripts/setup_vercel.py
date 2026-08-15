#!/usr/bin/env python3
"""Vercelプロジェクトの一括作成・Root Directory設定・環境変数投入スクリプト。

このリポジトリ(モノレポ)内の各アプリ(scripts/vercel-apps.json に定義)ごとに、
GitHub連携済みのVercelプロジェクトを1つずつ作成し、Root Directoryを設定し、
.env.vercel.local に書いた値を環境変数として登録する。

前提:
  - pip install 不要(標準ライブラリのみ)。Python 3.8+ で動作。
  - 環境変数 VERCEL_TOKEN が必須(Vercelダッシュボード > Settings > Tokens で発行)。
  - Vercel チーム/Organizationアカウントの場合は VERCEL_TEAM_ID も設定する
    (個人アカウントなら不要)。
  - Vercel 側で GitHub App 連携(AGU-ekiden組織へのアクセス許可)が済んでいること。
    未連携の場合はプロジェクト作成時にAPIがエラーを返すので、先にVercelダッシュ
    ボードで一度どれか1つのプロジェクトをGitHub連携込みで手動作成すると連携が
    済み、以降はこのスクリプトで作成できるようになることが多い。
  - 秘密の環境変数値は .env.vercel.local (git管理外)に
        KEY=VALUE
    の形式で書いておく。値が無いキーは登録をスキップし、最後に一覧を表示する
    (Vercelダッシュボードから手動で追加する)。

使い方:
    cp .env.vercel.local.example .env.vercel.local
    # .env.vercel.local を実際の値で埋める
    export VERCEL_TOKEN=xxxxxxxx
    # 必要なら: export VERCEL_TEAM_ID=team_xxxxxxxx

    python3 scripts/setup_vercel.py --dry-run   # まず内容を確認
    python3 scripts/setup_vercel.py             # 実行
    python3 scripts/setup_vercel.py --only ryouhi,tiryou-karte  # 一部だけ
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APPS_FILE = ROOT / "scripts" / "vercel-apps.json"
SECRETS_FILE = ROOT / ".env.vercel.local"
API_BASE = "https://api.vercel.com"


def load_apps() -> dict:
    return json.loads(APPS_FILE.read_text(encoding="utf-8"))


def load_secrets() -> dict:
    if not SECRETS_FILE.exists():
        return {}
    values = {}
    for line in SECRETS_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip()
    return values


class VercelClient:
    def __init__(self, token: str, team_id: str | None, dry_run: bool):
        self.token = token
        self.team_id = team_id
        self.dry_run = dry_run

    def _url(self, path: str) -> str:
        url = f"{API_BASE}{path}"
        if self.team_id:
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}teamId={self.team_id}"
        return url

    def request(self, method: str, path: str, body: dict | None = None):
        url = self._url(path)
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"Bearer {self.token}")
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read()
                return resp.status, (json.loads(raw) if raw else {})
        except urllib.error.HTTPError as e:
            raw = e.read()
            try:
                return e.code, json.loads(raw)
            except json.JSONDecodeError:
                return e.code, {"error": {"message": raw.decode("utf-8", "replace")}}
        except urllib.error.URLError as e:
            return 0, {"error": {"message": f"接続エラー: {e.reason}"}}

    def get_project(self, name: str):
        status, body = self.request("GET", f"/v9/projects/{name}")
        if status == 200:
            return body
        if status not in (0, 404):
            print(f"  警告: プロジェクト確認に失敗しました ({status}: {body}). 新規作成を試みます。")
        return None

    def create_project(self, name: str, framework: str | None, repo: str):
        body = {
            "name": name,
            "framework": framework,
            "gitRepository": {"type": "github", "repo": repo},
        }
        if self.dry_run:
            print(f"  [dry-run] POST /v10/projects {body}")
            return {"id": f"dry-run-{name}"}
        status, resp = self.request("POST", "/v10/projects", body)
        if status not in (200, 201):
            raise RuntimeError(f"プロジェクト作成失敗 ({status}): {resp}")
        return resp

    def set_root_directory(self, project_id: str, root_directory: str):
        body = {"rootDirectory": root_directory}
        if self.dry_run:
            print(f"  [dry-run] PATCH /v9/projects/{project_id} {body}")
            return
        status, resp = self.request("PATCH", f"/v9/projects/{project_id}", body)
        if status != 200:
            raise RuntimeError(f"Root Directory設定失敗 ({status}): {resp}")

    def list_env_keys(self, project_id: str) -> set[str]:
        if project_id.startswith("dry-run-"):
            return set()
        status, resp = self.request("GET", f"/v10/projects/{project_id}/env")
        if status != 200:
            if status != 404:
                print(f"  警告: 既存の環境変数一覧を取得できませんでした ({status}: {resp})")
            return set()
        return {e["key"] for e in resp.get("envs", [])}

    def add_env(self, project_id: str, key: str, value: str):
        body = {
            "key": key,
            "value": value,
            "type": "encrypted",
            "target": ["production", "preview", "development"],
        }
        if self.dry_run:
            print(f"  [dry-run] POST /v10/projects/{project_id}/env key={key} (値は非表示)")
            return
        status, resp = self.request("POST", f"/v10/projects/{project_id}/env", body)
        if status not in (200, 201):
            raise RuntimeError(f"環境変数 {key} の設定失敗 ({status}): {resp}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="APIを呼ばず、実行内容だけ表示する")
    parser.add_argument("--only", help="カンマ区切りのアプリID。指定したものだけ処理する")
    args = parser.parse_args()

    token = os.environ.get("VERCEL_TOKEN")
    if not token:
        print("エラー: 環境変数 VERCEL_TOKEN が設定されていません。", file=sys.stderr)
        sys.exit(1)
    team_id = os.environ.get("VERCEL_TEAM_ID")

    data = load_apps()
    repo = data["repo"]
    apps = data["apps"]
    if args.only:
        wanted = set(args.only.split(","))
        apps = [a for a in apps if a["id"] in wanted]
        if not apps:
            print(f"エラー: --only に一致するアプリがありません: {args.only}", file=sys.stderr)
            sys.exit(1)

    secrets = load_secrets()
    client = VercelClient(token, team_id, args.dry_run)

    missing_envs: list[str] = []

    for app in apps:
        app_id = app["id"]
        name = app["projectName"]
        print(f"\n=== {app_id} ({name}) ===")

        if app.get("skipAutoCreate"):
            print(f"  スキップ: {app.get('note', '手動での対応が必要です')}")
            continue

        project = client.get_project(name)
        if project is None:
            print(f"  プロジェクトが無いので作成します (framework={app['framework']})")
            project = client.create_project(name, app["framework"], repo)
        else:
            print("  既存プロジェクトを使用します")
        project_id = project.get("id", name)

        if app["rootDirectory"]:
            print(f"  Root Directory -> {app['rootDirectory']}")
            client.set_root_directory(project_id, app["rootDirectory"])

        existing_keys = client.list_env_keys(project_id)
        for env in app.get("envVars", []):
            key = env["key"]
            if key in existing_keys:
                print(f"  env {key}: 既に設定済みなのでスキップ")
                continue
            value = secrets.get(key)
            if value:
                print(f"  env {key}: 設定します")
                client.add_env(project_id, key, value)
            else:
                mark = "必須" if env.get("required") else "任意"
                print(f"  env {key}: 値が .env.vercel.local に無いためスキップ ({mark})")
                missing_envs.append(f"{app_id}: {key} ({mark}) {env.get('note', '')}".strip())

    print("\n" + "=" * 60)
    if missing_envs:
        print("未設定の環境変数(Vercelダッシュボードから手動で追加してください):")
        for line in missing_envs:
            print(f"  - {line}")
    else:
        print("全ての環境変数が設定されました。")
    print("=" * 60)


if __name__ == "__main__":
    main()
