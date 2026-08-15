"""parse_enex.py の出力(段落リスト)を、Notionのカルテ項目に分類する。

重要な設計方針:
  LLMには「原文を書き写させない」。段落ごとに通し番号を振り、
  「この段落はどの項目に属するか」だけを分類させ、実際のテキストは
  スクリプト側で元の段落をそのまま連結して使う。
  これにより、Evernote本文の漢字/かなが一切書き換えられず、
  過去に発生した「LLMが書き写す際の文字化け」を構造的に防止する。

使い方:
    export ANTHROPIC_API_KEY=sk-ant-...
    python3 classify.py data/parsed/若林良樹.json --out data/classified/若林良樹.json
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from common import (
    anthropic_messages,
    extract_json_block,
    load_env_file,
    notion_request,
    require_env,
    slugify_person_name,
)

FIELD_KEYS = ["chiefComplaint", "physicalCheck", "procedureContent", "trainingContent", "memo"]

FIELD_DESCRIPTIONS = {
    "chiefComplaint": "主訴（痛み・違和感・疲労度など、本人の訴え）",
    "physicalCheck": "状態（フィジカルチェック）（可動域・アライメント等トレーナーの所見）",
    "procedureContent": "実施内容（施術・ケアとして実施した内容。マッサージ、針など）",
    "trainingContent": "トレーニング内容（メニュー・セット数・重量・フォームのポイントなど）",
    "memo": "memo（次回への申し送り、その他の所感）",
}

def fetch_select_options(database_id: str) -> dict[str, list[str]]:
    db = notion_request("GET", f"/databases/{database_id}")
    props = db.get("properties", {})

    def options_of(name: str, kind: str) -> list[str]:
        prop = props.get(name)
        if not prop or prop.get("type") != kind:
            return []
        return [o["name"] for o in prop[kind]["options"]]

    return {
        "trainers": options_of("担当トレーナー名", "select"),
        "locations": options_of("場所", "select"),
        "tags": options_of("タグ", "multi_select"),
    }


def build_prompt(note: dict[str, Any], options: dict[str, list[str]]) -> tuple[str, str]:
    system = (
        "あなたはスポーツトレーナーが書いた施術記録(Evernoteのノート)を、"
        "カルテデータベースの項目に仕分ける仕事をしています。\n\n"
        "最重要ルール: 段落の本文を書き写してはいけません。"
        "各段落には既に通し番号が振られています。あなたの仕事は、"
        "その番号を対応する項目に振り分けることだけです。"
        "本文テキストをレスポンスに含めないでください（番号のみ）。\n\n"
        "項目の定義:\n"
        + "\n".join(f"- {k}: {v}" for k, v in FIELD_DESCRIPTIONS.items())
        + "\n\n1つの段落は1つの項目にのみ割り当ててください。"
        "どの項目にも当てはまらない段落（挨拶や無関係な文言など）は割り当てなくて構いません。\n\n"
        "trainerNameは次の候補から本文中に明記されていれば選んでください（無ければnull）: "
        + ", ".join(options.get("trainers", []) or ["(候補なし)"])
        + "\nlocationも同様に次の候補から: "
        + ", ".join(options.get("locations", []) or ["(候補なし)"])
        + "\ntagsは次の候補の中から当てはまるものだけを選んでください（複数可、無ければ空配列）: "
        + ", ".join(options.get("tags", []) or ["(候補なし)"])
        + "\n\n本文中に明示的な日付（例: 1/15, 2024年1月15日）があれば treatmentDate として "
        "YYYY-MM-DD形式で抽出してください。無ければnullにしてください"
        "（ノート作成日から自動補完するのでnullで問題ありません）。\n\n"
        "以下のJSON形式のみを出力してください。説明文は不要です。\n"
        "{\n"
        '  "treatmentDate": "YYYY-MM-DD or null",\n'
        '  "trainerName": "string or null",\n'
        '  "location": "string or null",\n'
        '  "tags": ["..."],\n'
        '  "fields": {\n'
        '    "chiefComplaint": [番号, ...],\n'
        '    "physicalCheck": [番号, ...],\n'
        '    "procedureContent": [番号, ...],\n'
        '    "trainingContent": [番号, ...],\n'
        '    "memo": [番号, ...]\n'
        "  }\n"
        "}"
    )

    numbered = "\n".join(f"[{i}] {p}" for i, p in enumerate(note["paragraphs"]))
    user = (
        f"ノートタイトル: {note['title']}\n"
        f"作成日: {note['created']}\n\n"
        f"段落一覧:\n{numbered}"
    )
    return system, user


def classify_note(
    note: dict[str, Any], options: dict[str, list[str]], model: str
) -> dict[str, Any]:
    if not note["paragraphs"]:
        return {
            "treatmentDate": None,
            "trainerName": None,
            "location": None,
            "tags": [],
            "fields": {k: [] for k in FIELD_KEYS},
        }
    system, user = build_prompt(note, options)
    raw = anthropic_messages(system=system, user_content=user, model=model)
    try:
        result = extract_json_block(raw)
    except (json.JSONDecodeError, ValueError) as exc:
        raise RuntimeError(f"分類結果のJSONパースに失敗: {exc}\n応答: {raw[:500]}") from exc
    return result


def reconstruct_record(
    note: dict[str, Any], classification: dict[str, Any], person: str
) -> dict[str, Any]:
    paragraphs = note["paragraphs"]
    n = len(paragraphs)

    def join_field(key: str) -> str:
        indices = classification.get("fields", {}).get(key, []) or []
        valid = [i for i in indices if isinstance(i, int) and 0 <= i < n]
        # 元の段落の並び順を保つ（モデルが返した順ではなく本文中の出現順）
        valid_sorted = sorted(set(valid))
        return "\n".join(paragraphs[i] for i in valid_sorted)

    treatment_date = classification.get("treatmentDate")
    if not treatment_date or not re.match(r"^\d{4}-\d{2}-\d{2}$", str(treatment_date)):
        # 本文中に明示日付が無ければ、Evernoteのノート作成日にフォールバック
        treatment_date = (note.get("created") or "")[:10] or None

    tags = classification.get("tags") or []
    if not isinstance(tags, list):
        tags = []

    return {
        "sourceNoteTitle": note["title"],
        "sourceNoteIndex": note["sourceIndex"],
        "clientName": person,
        "treatmentDate": treatment_date,
        "trainerName": classification.get("trainerName") or "",
        "location": classification.get("location") or "",
        "tags": [t for t in tags if isinstance(t, str)],
        "chiefComplaint": join_field("chiefComplaint"),
        "physicalCheck": join_field("physicalCheck"),
        "procedureContent": join_field("procedureContent"),
        "trainingContent": join_field("trainingContent"),
        "memo": join_field("memo"),
        "resources": note.get("resources", []),
        "rawParagraphs": paragraphs,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("parsed_json", type=Path, help="parse_enex.py の出力JSON")
    parser.add_argument("--out", type=Path, help="出力先(省略時は data/classified/<person>.json)")
    parser.add_argument(
        "--model",
        default="claude-haiku-4-5-20251001",
        help="分類に使うAnthropicモデル(デフォルト: claude-haiku-4-5-20251001。精度重視ならclaude-sonnet-5)",
    )
    parser.add_argument("--limit", type=int, help="先頭N件のみ処理する(テスト用)")
    args = parser.parse_args()

    load_env_file()
    database_id = require_env("NOTION_DATABASE_ID")

    payload = json.loads(args.parsed_json.read_text(encoding="utf-8"))
    person = payload["person"]
    notes = payload["notes"]
    if args.limit:
        notes = notes[: args.limit]

    print(f"{person}: {len(notes)}件のノートを分類します(model={args.model})")
    options = fetch_select_options(database_id)
    print(f"  既存の選択肢 - トレーナー: {options['trainers']} / 場所: {options['locations']} / タグ: {options['tags']}")

    records = []
    for i, note in enumerate(notes, start=1):
        print(f"  [{i}/{len(notes)}] {note['title']} ({len(note['paragraphs'])}段落)")
        classification = classify_note(note, options, args.model)
        records.append(reconstruct_record(note, classification, person))

    out_path = args.out or Path("data/classified") / f"{slugify_person_name(person)}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps({"person": person, "records": records}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"完了: {len(records)}件を出力しました -> {out_path}")
    print("次のステップ: write_to_notion.py に渡す前に、出力JSONの内容をレビューしてください")
    print("(特に trainerName / location / tags が候補から正しく選ばれているか確認してください)")


if __name__ == "__main__":
    main()
