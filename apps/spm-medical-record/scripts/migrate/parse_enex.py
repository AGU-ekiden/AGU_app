"""Evernoteの.enexエクスポートファイルをパースし、ノートごとに
「段落のリスト」+「添付メディア」に分解する。

LLMは一切使わない、純粋なXML/テキスト処理。
これにより本文の文字は一切書き換えられず、原文がそのまま後段に渡る。

使い方:
    python3 parse_enex.py path/to/person.enex --person "若林良樹" \
        --out-dir data/parsed
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import mimetypes
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

from common import slugify_person_name

BLOCK_TAGS = {"div", "p", "li", "table", "tr", "h1", "h2", "h3", "h4"}
WHITESPACE_RE = re.compile(r"[ \t\r\n　]+")


class EnmlToParagraphs(HTMLParser):
    """ENML(EvernoteのXHTMLサブセット)を段落のリストに変換する。

    タグを剥がすだけで、テキストの中身には一切手を加えない
    (空白の連続を1つに畳むのみ。漢字/かなの文字は unaffected)。
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.paragraphs: list[str] = []
        self._current: list[str] = []
        self.media_hashes: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "br" or tag in BLOCK_TAGS:
            self._break()
        elif tag == "en-media":
            attrs_d = dict(attrs)
            h = attrs_d.get("hash")
            if h:
                self.media_hashes.append(h)
        elif tag == "en-todo":
            self._current.append("[ ] ")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag: str) -> None:
        if tag in BLOCK_TAGS:
            self._break()

    def handle_data(self, data: str) -> None:
        if data:
            self._current.append(data)

    def _break(self) -> None:
        text = WHITESPACE_RE.sub(" ", "".join(self._current)).strip()
        if text:
            self.paragraphs.append(text)
        self._current = []

    def close(self) -> None:
        self._break()
        super().close()


def parse_evernote_timestamp(raw: str) -> str | None:
    """'20240115T093000Z' -> '2024-01-15T09:30:00Z'"""
    m = re.match(r"^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$", raw.strip())
    if not m:
        return None
    y, mo, d, h, mi, s = m.groups()
    return f"{y}-{mo}-{d}T{h}:{mi}:{s}Z"


@dataclass
class ParsedResource:
    hash: str
    mime: str
    filename: str
    data: bytes


@dataclass
class ParsedNote:
    title: str
    created: str | None
    updated: str | None
    paragraphs: list[str]
    media_hashes: list[str]
    resources: list[ParsedResource] = field(default_factory=list)


def parse_note_element(note_elem: ET.Element) -> ParsedNote:
    title = (note_elem.findtext("title") or "").strip()
    created_raw = note_elem.findtext("created") or ""
    updated_raw = note_elem.findtext("updated") or ""
    content_raw = note_elem.findtext("content") or ""

    html_parser = EnmlToParagraphs()
    html_parser.feed(content_raw)
    html_parser.close()

    resources: list[ParsedResource] = []
    for res_elem in note_elem.findall("resource"):
        data_elem = res_elem.find("data")
        if data_elem is None or not data_elem.text:
            continue
        raw_b64 = "".join(data_elem.text.split())
        try:
            binary = base64.b64decode(raw_b64)
        except (ValueError, base64.binascii.Error):  # type: ignore[attr-defined]
            continue
        md5hex = hashlib.md5(binary).hexdigest()
        mime = (res_elem.findtext("mime") or "application/octet-stream").strip()
        filename = None
        attrs_elem = res_elem.find("resource-attributes")
        if attrs_elem is not None:
            filename = attrs_elem.findtext("file-name")
        if not filename:
            ext = mimetypes.guess_extension(mime) or ""
            filename = f"{md5hex}{ext}"
        resources.append(ParsedResource(hash=md5hex, mime=mime, filename=filename, data=binary))

    return ParsedNote(
        title=title,
        created=parse_evernote_timestamp(created_raw),
        updated=parse_evernote_timestamp(updated_raw),
        paragraphs=html_parser.paragraphs,
        media_hashes=html_parser.media_hashes,
        resources=resources,
    )


def parse_enex_file(path: Path) -> list[ParsedNote]:
    tree = ET.parse(path)
    root = tree.getroot()
    return [parse_note_element(note_elem) for note_elem in root.findall("note")]


def write_output(notes: list[ParsedNote], person: str, out_dir: Path) -> Path:
    slug = slugify_person_name(person)
    resources_dir = out_dir / f"{slug}_resources"
    resources_dir.mkdir(parents=True, exist_ok=True)

    notes_json: list[dict] = []
    for i, note in enumerate(notes):
        resource_entries = []
        for res in note.resources:
            rel_path = f"{slug}_resources/{res.hash}_{res.filename}"
            (out_dir / rel_path).write_bytes(res.data)
            resource_entries.append(
                {"hash": res.hash, "mime": res.mime, "filename": res.filename, "path": rel_path}
            )
        notes_json.append(
            {
                "sourceIndex": i,
                "title": note.title,
                "created": note.created,
                "updated": note.updated,
                "paragraphs": note.paragraphs,
                "mediaHashes": note.media_hashes,
                "resources": resource_entries,
            }
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{slug}.json"
    out_path.write_text(
        json.dumps({"person": person, "notes": notes_json}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("enex_files", nargs="+", type=Path, help=".enexファイル(複数可、同一人物分をまとめて渡せる)")
    parser.add_argument("--person", required=True, help="クライアント名(Notionの氏名と一致させる)")
    parser.add_argument("--out-dir", type=Path, default=Path("data/parsed"), help="出力先ディレクトリ")
    args = parser.parse_args()

    all_notes: list[ParsedNote] = []
    for enex_path in args.enex_files:
        if not enex_path.exists():
            raise SystemExit(f"ファイルが見つかりません: {enex_path}")
        notes = parse_enex_file(enex_path)
        print(f"  {enex_path.name}: {len(notes)}件のノートを読み込みました")
        all_notes.extend(notes)

    out_path = write_output(all_notes, args.person, args.out_dir)
    total_resources = sum(len(n.resources) for n in all_notes)
    print(f"合計 {len(all_notes)}件のノート / {total_resources}件の添付メディアを解析しました")
    print(f"出力: {out_path}")


if __name__ == "__main__":
    main()
