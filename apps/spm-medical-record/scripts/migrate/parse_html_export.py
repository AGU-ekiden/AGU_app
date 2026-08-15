"""Evernoteの「HTML形式でエクスポート」(複数ノートをまとめた単一.htmlファイル)を
パースし、そのままwrite_to_notion.pyに渡せる「分類済みJSON」を直接出力する。

実データを確認したところ、トレーナーはノートを表形式（<table>）で書いており、
行=項目(Date/担当/場所/主訴/状態/実施内容/training/memo/handwriting/photo)、
列=セッション(①②③...)という構造になっていた。
この形式であればLLMによる分類は不要で、セルの値をそのまま抜き出すだけで
byte-exactにNotionへ書き込めるデータが作れる(文字化けのリスクがそもそも無い)。

セッション表以外の形式のノート(初回問診票など)は自動マッピングせず、
「未対応ノート一覧」として別ファイルに書き出し、人の目でのレビューに回す。

使い方:
    python3 parse_html_export.py "中村海斗/中村海斗.html" --person "中村海斗" \
        --out data/classified/中村海斗.json
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup, Tag

from common import slugify_person_name

# 実データで確認された行ラベル -> KarteFormDataのキーへのマッピング
ROW_LABEL_MAP = {
    "date": "treatmentDate",
    "担当": "trainerName",
    "場所": "location",
    "主訴": "chiefComplaint",
    "状態（フィジカルチェック）": "physicalCheck",
    "実施内容": "procedureContent",
    "training": "trainingContent",
    "memo": "memo",
}
MEDIA_ROW_LABELS = {"handwriting", "photo"}
# セッション表と判定するための必須ラベル(表記ゆれを許容するため一部のみで判定)
REQUIRED_ROW_LABELS = {"date", "主訴", "training"}


def normalize_label(text: str) -> str:
    return re.sub(r"[,、\s]+$", "", text.strip()).lower()


def parse_date_cell(text: str) -> str | None:
    m = re.search(r"(\d{4})/(\d{1,2})/(\d{1,2})", text)
    if not m:
        return None
    y, mo, d = m.groups()
    return f"{y}-{int(mo):02d}-{int(d):02d}"


def find_note_boundaries(soup: BeautifulSoup) -> list[dict[str, Any]]:
    """<meta itemprop="title">を目印に、ノート単位の区切りを見つける。"""
    metas = soup.find_all("meta", attrs={"itemprop": "title"})
    notes = []
    for i, meta in enumerate(metas):
        title = meta.get("content", "")
        created_meta = meta.find_next("meta", attrs={"itemprop": "created"})
        created = created_meta.get("content") if created_meta else None
        notes.append({"index": i, "title": title, "created": created, "start_node": meta})
    return notes


def tables_between(start_node: Tag, end_node: Tag | None) -> list[Tag]:
    tables = []
    node = start_node
    while node is not None and node is not end_node:
        node = node.find_next(["table", "meta"])
        if node is None or node is end_node:
            break
        if node.name == "table":
            tables.append(node)
        elif node.name == "meta" and node.get("itemprop") == "title":
            break
    return tables


def extract_table_rows(table: Tag) -> list[tuple[str, list[Tag]]]:
    rows = table.find_all("tr")
    out = []
    for row in rows:
        cells = row.find_all(["td", "th"])
        if not cells:
            continue
        label = normalize_label(cells[0].get_text(strip=True))
        out.append((label, cells))
    return out


def is_session_table(rows: list[tuple[str, list[Tag]]]) -> bool:
    labels = {label for label, _ in rows}
    return REQUIRED_ROW_LABELS.issubset(labels)


def resolve_media_paths(cell: Tag, html_dir: Path, files_dir_name: str) -> list[str]:
    paths = []
    for img in cell.find_all("img"):
        src = img.get("src", "")
        if not src:
            continue
        rel = src.replace("\\", "/")
        # "<person> files/xxx.jpg" の "<person> files" 部分を実際のフォルダ名に正規化
        rel_parts = rel.split("/", 1)
        if len(rel_parts) == 2:
            rel = f"{files_dir_name}/{rel_parts[1]}"
        paths.append(rel)
    return paths


def extract_session_records(
    table: Tag, note_title: str, note_index: int, person: str, html_dir: Path, files_dir_name: str
) -> list[dict[str, Any]]:
    rows = extract_table_rows(table)
    row_by_label = {label: cells for label, cells in rows}

    date_cells = row_by_label.get("date", [])
    n_sessions = len(date_cells) - 1  # 先頭セルは行ラベル自身
    records = []
    for col in range(1, n_sessions + 1):
        date_text = date_cells[col].get_text(strip=True) if col < len(date_cells) else ""
        treatment_date = parse_date_cell(date_text)
        if not treatment_date:
            continue  # 日付が無い(未使用の)列はスキップ

        record: dict[str, Any] = {
            "sourceNoteTitle": note_title,
            "sourceNoteIndex": note_index,
            "clientName": person,
            "treatmentDate": treatment_date,
            "trainerName": "",
            "location": "",
            "tags": [],
            "chiefComplaint": "",
            "physicalCheck": "",
            "procedureContent": "",
            "trainingContent": "",
            "memo": "",
            "resources": [],
            "rawParagraphs": [],
        }
        for label, field_key in ROW_LABEL_MAP.items():
            if field_key == "treatmentDate":
                continue
            cells = row_by_label.get(label, [])
            if col < len(cells):
                record[field_key] = cells[col].get_text("\n", strip=True)

        media_paths: list[str] = []
        for media_label in MEDIA_ROW_LABELS:
            cells = row_by_label.get(media_label, [])
            if col < len(cells):
                media_paths.extend(resolve_media_paths(cells[col], html_dir, files_dir_name))
        record["resources"] = [{"path": p} for p in media_paths]

        records.append(record)
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("html_file", type=Path, help="EvernoteからHTMLエクスポートした.htmlファイル")
    parser.add_argument("--person", required=True, help="クライアント名(Notionの氏名と一致させる)")
    parser.add_argument("--out", type=Path, help="出力先(省略時はdata/classified/<person>.json)")
    args = parser.parse_args()

    if not args.html_file.exists():
        raise SystemExit(f"ファイルが見つかりません: {args.html_file}")

    html_dir = args.html_file.parent
    files_dir_name = f"{args.html_file.stem} files"
    if not (html_dir / files_dir_name).exists():
        print(f"警告: 添付ファイル用フォルダ「{files_dir_name}」が見つかりません(写真の無いノートの場合は問題ありません)")

    soup = BeautifulSoup(args.html_file.read_text(encoding="utf-8"), "html.parser")
    notes = find_note_boundaries(soup)
    print(f"{len(notes)}件のノートを検出しました")

    all_records: list[dict[str, Any]] = []
    unhandled_notes: list[dict[str, Any]] = []

    for i, note in enumerate(notes):
        end_node = notes[i + 1]["start_node"] if i + 1 < len(notes) else None
        tables = tables_between(note["start_node"], end_node)
        note_records: list[dict[str, Any]] = []
        other_tables_text = []

        for table in tables:
            rows = extract_table_rows(table)
            if is_session_table(rows):
                note_records.extend(
                    extract_session_records(table, note["title"], note["index"], args.person, html_dir, files_dir_name)
                )
            else:
                other_tables_text.append([(label, [c.get_text("\n", strip=True) for c in cells]) for label, cells in rows])

        if note_records:
            print(f"  [{note['title']}] セッション表として {len(note_records)}件のレコードを抽出")
            all_records.extend(note_records)
        elif tables:
            print(f"  [{note['title']}] セッション表の形式に一致しないため未対応ノートとして保存します")
            unhandled_notes.append({"title": note["title"], "created": note["created"], "tables": other_tables_text})
        else:
            print(f"  [{note['title']}] テーブルが見つかりませんでした(スキップ)")

    out_path = args.out or Path("data/classified") / f"{slugify_person_name(args.person)}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps({"person": args.person, "records": all_records}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"完了: {len(all_records)}件のセッションレコードを出力しました -> {out_path}")

    if unhandled_notes:
        other_path = out_path.parent / f"{slugify_person_name(args.person)}_unhandled.json"
        other_path.write_text(json.dumps(unhandled_notes, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"注意: セッション表以外の形式のノートが{len(unhandled_notes)}件ありました -> {other_path}")
        print("      (初回問診票など。内容を確認して、必要なら手動で選手プロフィールに反映してください)")


if __name__ == "__main__":
    main()
