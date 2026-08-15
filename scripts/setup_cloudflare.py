#!/usr/bin/env python3
"""Cloudflare Pagesプロジェクトの一括作成・ビルド設定・環境変数投入スクリプト。

対象は静的サイト・Viteアプリ(scripts/cloudflare-apps.json に定義)のみ。
Next.jsの3アプリ(tiryou-karte / spm-medical-record / itonomaki)はPagesでは
なくCloudflare Workers(OpenNext)で動かすため対象外。各アプリのディレクトリで
`npm run cf:deploy` (= `opennextjs-cloudflare build && wrangler deploy`) を
実行してデプロイする。詳細は scripts/README.md 参照。

前提:
  - pip install 不要(標準ライブラリのみ)。Python 3.8+ で動作。
  - 環境変数 CLOUDFLARE_API_TOKEN が必須
    (Cloudflareダッシュボード → My Profile → API Tokens → Create Token。
    "Account > Cloudflare Pages > Edit" 権限が必要)
  - 環境変数 CLOUDFLARE_ACCOUNT_ID が必須
    (ダッシュボードの右サイドバー、または任意のドメインの概要ページに表示)
  - Cloudflareでこのリポジトリ(AGU-ekiden/AGU_app)を扱うのが初めての場合、
    先にダッシュボードでGitHub連携を1回済ませておくこと(Pages → Create a
    project → Connect to Git)。未連携だとAPIでのプロジェクト作成が失敗する
    ことがある。
  - 秘密の環境変数値は .env.vercel.local (Vercelスクリプトと共用)から
    キーだけ拾って読む。値が無いキーはスキップして最後に一覧表示する。

使い方:
    export CLOUDFLARE_API_TOKEN=xxxxxxxx
    export CLOUDFLARE_ACCOUNT_ID=xxxxxxxx

    python3 scripts/setup_cloudflare.py --dry-run
    python3 scripts/setup_cloudflare.py
    python3 scripts/setup_cloudflare.py --only ryouhi,label_create
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
APPS_FILE = ROOT / "scripts" / "cloudflare-apps.json"
SECRETS_FILE = ROOT / ".env.vercel.local"
API_BASE = "https://api.cloudflare.com/client/v4"


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


class CloudflareClient:
    def __init__(self, token: str, account_id: str, dry_run: bool):
        self.token = token
        self.account_id = account_id
        self.dry_run = dry_run

    def request(self, method: str, path: str, body: dict | None = None):
        url = f"{API_BASE}{path}"
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
                return e.code, {"errors": [{"message": raw.decode("utf-8", "replace")}]}
        except urllib.error.URLError as e:
            return 0, {"errors": [{"message": f"接続エラー: {e.reason}"}]}

    def get_project(self, name: str):
        status, body = self.request(
            "GET", f"/accounts/{self.account_id}/pages/projects/{name}"
        )
        if status == 200 and body.get("success"):
            return body.get("result")
        if status not in (0, 404):
            print(f"  警告: プロジェクト確認に失敗しました ({status}: {body.get('errors')}). 新規作成を試みます。")
        return None

    def create_project(self, app: dict, repo: dict, production_branch: str):
        body = {
            "name": app["projectName"],
            "production_branch": production_branch,
            "build_config": {
                "build_command": app["buildCommand"],
                "destination_dir": app["destinationDir"],
                "root_dir": app["rootDir"],
            },
            "source": {
                "type": "github",
                "config": {
                    "owner": repo["owner"],
                    "repo_name": repo["name"],
                    "production_branch": production_branch,
                    "deployments_enabled": True,
                    "pr_comments_enabled": False,
                },
            },
        }
        if self.dry_run:
            print(f"  [dry-run] POST /accounts/{{account}}/pages/projects {body}")
            return {"id": f"dry-run-{app['projectName']}"}
        status, resp = self.request(
            "POST", f"/accounts/{self.account_id}/pages/projects", body
        )
        if status not in (200, 201) or not resp.get("success"):
            raise RuntimeError(f"プロジェクト作成失敗 ({status}): {resp.get('errors')}")
        return resp["result"]

    def existing_env_keys(self, project: dict) -> set[str]:
        cfg = (project or {}).get("deployment_configs", {}).get("production", {})
        return set((cfg.get("env_vars") or {}).keys())

    def set_env_vars(self, name: str, keys_values: dict[str, str]):
        if not keys_values:
            return
        env_vars = {k: {"value": v, "type": "plain_text"} for k, v in keys_values.items()}
        body = {
            "deployment_configs": {
                "production": {"env_vars": env_vars},
                "preview": {"env_vars": env_vars},
            }
        }
        if self.dry_run:
            print(f"  [dry-run] PATCH /accounts/{{account}}/pages/projects/{name} env keys={list(keys_values)} (値は非表示)")
            return
        status, resp = self.request(
            "PATCH", f"/accounts/{self.account_id}/pages/projects/{name}", body
        )
        if status != 200 or not resp.get("success"):
            raise RuntimeError(f"環境変数の設定失敗 ({status}): {resp.get('errors')}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="APIを呼ばず、実行内容だけ表示する")
    parser.add_argument("--only", help="カンマ区切りのアプリID。指定したものだけ処理する")
    args = parser.parse_args()

    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    if not token or not account_id:
        print("エラー: 環境変数 CLOUDFLARE_API_TOKEN と CLOUDFLARE_ACCOUNT_ID の両方が必要です。", file=sys.stderr)
        sys.exit(1)

    data = load_apps()
    repo = data["repo"]
    production_branch = data["productionBranch"]
    apps = data["apps"]
    if args.only:
        wanted = set(args.only.split(","))
        apps = [a for a in apps if a["id"] in wanted]
        if not apps:
            print(f"エラー: --only に一致するアプリがありません: {args.only}", file=sys.stderr)
            sys.exit(1)

    secrets = load_secrets()
    client = CloudflareClient(token, account_id, args.dry_run)

    missing_envs: list[str] = []

    for app in apps:
        app_id = app["id"]
        name = app["projectName"]
        print(f"\n=== {app_id} ({name}) ===")

        project = client.get_project(name)
        if project is None:
            print(f"  プロジェクトが無いので作成します (root_dir={app['rootDir'] or '(repo root)'})")
            project = client.create_project(app, repo, production_branch)
        else:
            print("  既存プロジェクトを使用します")

        existing_keys = client.existing_env_keys(project)
        to_set = {}
        for env in app.get("envVars", []):
            key = env["key"]
            if key in existing_keys:
                print(f"  env {key}: 既に設定済みなのでスキップ")
                continue
            value = secrets.get(key)
            if value:
                print(f"  env {key}: 設定します")
                to_set[key] = value
            else:
                mark = "必須" if env.get("required") else "任意"
                print(f"  env {key}: 値が .env.vercel.local に無いためスキップ ({mark})")
                missing_envs.append(f"{app_id}: {key} ({mark}) {env.get('note', '')}".strip())
        client.set_env_vars(name, to_set)

    print("\n" + "=" * 60)
    if missing_envs:
        print("未設定の環境変数(Cloudflareダッシュボードから手動で追加してください):")
        for line in missing_envs:
            print(f"  - {line}")
    else:
        print("全ての環境変数が設定されました。")
    print("Next.jsアプリ(tiryou-karte / spm-medical-record / itonomaki)はこの")
    print("スクリプトの対象外です。scripts/README.md の Workers デプロイ手順を参照してください。")
    print("=" * 60)


if __name__ == "__main__":
    main()
