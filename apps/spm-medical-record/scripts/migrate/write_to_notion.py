"""classify.py / parse_html_export.py の出力(レビュー済みJSON)をNotionに書き込む。

スクリプトを1回実行すれば全件処理する(レコードごとの許可プロンプトは発生しない)。
デフォルトはdry-run。実際に書き込むには --commit を付ける。

安全装置:
  - 選手名(clientName)は空白の有無とUnicode正規化(NFKC)の差を無視して「部員」DBの
    氏名と照合する(エクスポート元のフォルダ名は「中村海斗」でも登録名が「中村　海斗」
    のように全角スペース区切りだったり、macOSでのエクスポートで一部の漢字が見た目の
    同じ「部首」用の別コードポイントに化けていたりするため)。マッチした場合、
    書き込む「クライアント名」は常に部員DB側の正式な登録名に統一する。
    マッチしない場合は書き込まずスキップし、候補となりそうな名前を提示する
    (誤った選手に紐付けない)
  - 担当トレーナー名は、Notion側に既に登録されている選択肢と照合する。
    一致しない値(会議メモ・LINE連絡・複数トレーナー併記など、実際のトレーナー名ではない
    記載が実データに存在した)は自動的にmemoへ退避し、担当トレーナー名は空欄にする
    (選択肢が汚れるのを防ぐ。元の記載は失われない)
  - 同一選手 x 同一施術日のレコードが既に存在する場合はスキップする(再実行しても重複しない)
  - 書き込み後、選手ごとに件数を再集計して期待値と比較する

使い方:
    python3 write_to_notion.py data/classified/若林良樹.json            # dry-run
    python3 write_to_notion.py data/classified/若林良樹.json --commit   # 実際に書き込む
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import time
import unicodedata
from pathlib import Path
from typing import Any

from common import load_env_file, notion_request, require_env


def normalize_name(name: str) -> str:
    """氏名比較用に空白(半角/全角)を除去し、Unicode正規化(NFKC)する。

    macOSでエクスポートしたファイル名では、一部の漢字(山/田/白/人など)が
    見た目は同じでもUnicode上は「部首(Kangxi Radical)」用の別のコードポイントに
    置き換わっていることがある(例: "⽚⼭" は "片山" と表示上ほぼ区別がつかないが
    別の文字)。NFKC正規化でこれを通常の漢字に統一してから比較する。
    """
    normalized = unicodedata.normalize("NFKC", name)
    return re.sub(r"[\s　]+", "", normalized)


def fetch_valid_trainer_names(database_id: str) -> set[str]:
    db = notion_request("GET", f"/databases/{database_id}")
    prop = db.get("properties", {}).get("担当トレーナー名", {})
    options = prop.get("select", {}).get("options", [])
    return {o["name"] for o in options}


def sanitize_trainer_name(record: dict[str, Any], valid_trainers: set[str]) -> None:
    """担当トレーナー名がNotion側の既存選択肢に無ければmemoへ退避する(破壊的変更、その場でrecordを書き換える)。"""
    trainer = record.get("trainerName", "")
    if trainer and trainer not in valid_trainers:
        note = f"[担当欄の元の記載: {trainer}]"
        record["memo"] = f"{note}\n{record['memo']}".strip() if record.get("memo") else note
        record["trainerName"] = ""
        record["_trainerNameSanitized"] = trainer


def rich_text(value: str) -> list[dict[str, Any]]:
    # Notion rich_text は1ブロックあたり2000文字制限があるため分割する
    chunks = [value[i : i + 1900] for i in range(0, len(value), 1900)] or [""]
    return [{"text": {"content": c}} for c in chunks]


def fetch_all_players(members_database_id: str) -> list[dict[str, str]]:
    players = []
    cursor = None
    while True:
        body: dict[str, Any] = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        resp = notion_request("POST", f"/databases/{members_database_id}/query", body)
        for page in resp.get("results", []):
            name_prop = page.get("properties", {}).get("氏名", {})
            title_parts = name_prop.get("title", [])
            name = "".join(t.get("plain_text", "") for t in title_parts)
            if name:
                players.append({"id": page["id"], "name": name})
        if not resp.get("has_more"):
            break
        cursor = resp.get("next_cursor")
    return players


def resolve_player(
    client_name: str, players: list[dict[str, str]]
) -> tuple[str | None, str | None, list[str]]:
    """氏名から(playerId, 部員DB側の正式な登録名, 候補一覧)を返す。

    空白の有無を無視して比較する(全角スペース区切りの登録名と、スペース無しの
    エクスポート元フォルダ名が一致しないケースに対応するため)。
    """
    target = normalize_name(client_name)
    for p in players:
        if normalize_name(p["name"]) == target:
            return p["id"], p["name"], []
    close = difflib.get_close_matches(client_name, [p["name"] for p in players], n=3, cutoff=0.5)
    return None, None, close


def find_existing_record(
    database_id: str, player_id: str, treatment_date: str, chief_complaint: str
) -> bool:
    # 同一選手・同一日に複数件の記録があるケースが実データにあるため(例: 通常セッションと
    # 別枠での怪我経過報告が同日に別々に書かれている)、日付だけでなく主訴の内容も一致する
    # 場合のみ「既存の同一レコード」とみなす(再実行時の重複作成防止が目的で、
    # 同日の別内容レコードまで誤ってスキップしないようにするため)
    body = {
        "filter": {
            "and": [
                {"property": "部員", "relation": {"contains": player_id}},
                {"property": "施術日", "date": {"equals": treatment_date}},
                {"property": "主訴", "rich_text": {"equals": chief_complaint[:2000]}},
            ]
        },
        "page_size": 1,
    }
    resp = notion_request("POST", f"/databases/{database_id}/query", body)
    return len(resp.get("results", [])) > 0


def count_records_for_player(database_id: str, player_id: str) -> int:
    total = 0
    cursor = None
    while True:
        body: dict[str, Any] = {
            "filter": {"property": "部員", "relation": {"contains": player_id}},
            "page_size": 100,
        }
        if cursor:
            body["start_cursor"] = cursor
        resp = notion_request("POST", f"/databases/{database_id}/query", body)
        total += len(resp.get("results", []))
        if not resp.get("has_more"):
            break
        cursor = resp.get("next_cursor")
    return total


def build_properties(record: dict[str, Any], player_id: str) -> dict[str, Any]:
    props: dict[str, Any] = {
        "クライアント名": {"title": rich_text(record["clientName"])},
        "主訴": {"rich_text": rich_text(record["chiefComplaint"])},
        "状態（フィジカルチェック）": {"rich_text": rich_text(record["physicalCheck"])},
        "実施内容": {"rich_text": rich_text(record["procedureContent"])},
        "トレーニング内容": {"rich_text": rich_text(record["trainingContent"])},
        "memo": {"rich_text": rich_text(record["memo"])},
        "タグ": {"multi_select": [{"name": t} for t in record["tags"]]},
        "部員": {"relation": [{"id": player_id}]},
    }
    if record.get("trainerName"):
        props["担当トレーナー名"] = {"select": {"name": record["trainerName"]}}
    if record.get("location"):
        props["場所"] = {"select": {"name": record["location"]}}
    if record.get("treatmentDate"):
        props["施術日"] = {"date": {"start": record["treatmentDate"]}}
    media_urls = record.get("mediaUrls") or []
    if media_urls:
        props["メディア"] = {
            "files": [
                {
                    "type": "external",
                    "name": url.rsplit("/", 1)[-1].split("?")[0] or "media",
                    "external": {"url": url},
                }
                for url in media_urls
            ]
        }
    return props


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("classified_json", type=Path, help="classify.py の出力JSON")
    parser.add_argument("--commit", action="store_true", help="実際にNotionへ書き込む(省略時はdry-run)")
    parser.add_argument("--sleep", type=float, default=0.4, help="書き込み間のスリープ秒数(レート制限対策)")
    args = parser.parse_args()

    load_env_file()
    database_id = require_env("NOTION_DATABASE_ID")
    members_database_id = require_env("NOTION_MEMBERS_DATABASE_ID")

    payload = json.loads(args.classified_json.read_text(encoding="utf-8"))
    person = payload["person"]
    records = payload["records"]

    print(f"{person}: {len(records)}件のレコードを処理します" + ("(dry-run)" if not args.commit else "(commit)"))

    players = fetch_all_players(members_database_id)
    player_id, canonical_name, suggestions = resolve_player(person, players)
    if not player_id:
        print(f"エラー: 「部員」DBに「{person}」が見つかりません。")
        if suggestions:
            print(f"  候補: {', '.join(suggestions)}")
        print("  先にNotion側で選手を登録するか、--person の表記を修正してください。処理を中止します。")
        return
    if canonical_name != person:
        print(f"  (「{person}」を部員DBの登録名「{canonical_name}」として書き込みます)")

    valid_trainers = fetch_valid_trainer_names(database_id)
    sanitized_count = 0
    for record in records:
        record["clientName"] = canonical_name
        sanitize_trainer_name(record, valid_trainers)
        if record.get("_trainerNameSanitized"):
            sanitized_count += 1
    if sanitized_count:
        print(f"  担当トレーナー名が選択肢に無い{sanitized_count}件をmemoへ退避し、担当欄を空欄にしました")

    created, skipped_duplicate, errors = 0, 0, []
    for i, record in enumerate(records, start=1):
        treatment_date = record.get("treatmentDate")
        if not treatment_date:
            errors.append(f"[{i}] 施術日が不明のためスキップ: {record.get('sourceNoteTitle')}")
            continue

        if find_existing_record(database_id, player_id, treatment_date, record.get("chiefComplaint", "")):
            print(f"  [{i}/{len(records)}] {treatment_date} は既に存在するためスキップ")
            skipped_duplicate += 1
            continue

        props = build_properties(record, player_id)
        if not args.commit:
            print(f"  [{i}/{len(records)}] (dry-run) 作成予定: {treatment_date} / トレーナー={record.get('trainerName') or '?'} / タグ={record.get('tags')}")
            created += 1
            continue

        notion_request("POST", "/pages", {"parent": {"database_id": database_id}, "properties": props})
        print(f"  [{i}/{len(records)}] {treatment_date} を作成しました")
        created += 1
        time.sleep(args.sleep)

    print()
    print(f"結果: 作成{'予定' if not args.commit else ''} {created}件 / 重複スキップ {skipped_duplicate}件 / エラー {len(errors)}件")
    for e in errors:
        print(f"  - {e}")

    if args.commit:
        actual = count_records_for_player(database_id, player_id)
        print(f"検証: {person} のNotion上の総レコード数 = {actual}件")


if __name__ == "__main__":
    main()
