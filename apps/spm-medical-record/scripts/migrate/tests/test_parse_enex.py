"""parse_enex.py のテスト。sample_data/sample.enex を実際にパースし、
本文が一字一句改変されずに抽出されることを確認する。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from parse_enex import parse_enex_file  # noqa: E402

SAMPLE_ENEX = Path(__file__).resolve().parents[1] / "sample_data" / "sample.enex"


def test_parse_sample_enex_extracts_two_notes():
    notes = parse_enex_file(SAMPLE_ENEX)
    assert len(notes) == 2


def test_parse_sample_enex_preserves_text_verbatim():
    notes = parse_enex_file(SAMPLE_ENEX)
    note = notes[0]
    assert note.title == "1/15 若林"
    assert note.created == "2024-01-15T09:30:00Z"
    assert "小山町合宿で右膝の滑液包炎が少し悪化している。" in note.paragraphs
    assert "①エロンゲーション" in note.paragraphs
    # 全角スペース・プライム記号などの特殊文字も壊れないこと
    assert "Level9 足先にポールを使う clamp①" in note.paragraphs
    assert "2′×1set" in note.paragraphs


def test_parse_sample_enex_extracts_resource_and_matches_media_hash():
    notes = parse_enex_file(SAMPLE_ENEX)
    note = notes[0]
    assert len(note.resources) == 1
    resource = note.resources[0]
    assert resource.filename == "photo1.txt"
    assert resource.data == b"FAKE_PHOTO_BYTES_FOR_TEST"
    # en-media の hash 属性と、実データから計算したmd5が一致していること
    assert resource.hash in note.media_hashes


def test_parse_sample_enex_second_note_has_no_resources():
    notes = parse_enex_file(SAMPLE_ENEX)
    note = notes[1]
    assert note.title == "1/22 若林"
    assert note.resources == []
    assert note.paragraphs == ["疲労度7~8", "・エロンゲーション", "Level9", "2′×2set"]


if __name__ == "__main__":
    test_parse_sample_enex_extracts_two_notes()
    test_parse_sample_enex_preserves_text_verbatim()
    test_parse_sample_enex_extracts_resource_and_matches_media_hash()
    test_parse_sample_enex_second_note_has_no_resources()
    print("すべてのテストが成功しました")
