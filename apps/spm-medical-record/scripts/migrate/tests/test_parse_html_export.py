"""parse_html_export.py のテスト。sample_data/sample_export.html を実際にパースし、
・本文が改変されず抽出されること
・同一日付でも内容が異なる複数レコードが両方保持されること(実データで確認した挙動)
・セッション表以外のノートは自動マッピングされないこと
を確認する。
"""

import json
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import parse_html_export  # noqa: E402

SAMPLE_HTML = Path(__file__).resolve().parents[1] / "sample_data" / "sample_export.html"


def _run_parser(tmp_dir: Path) -> dict:
    html_path = tmp_dir / "sample_export.html"
    shutil.copy(SAMPLE_HTML, html_path)
    files_dir = tmp_dir / "sample_export files"
    files_dir.mkdir()
    (files_dir / "20240101_photo.jpg").write_bytes(b"fake")

    out_path = tmp_dir / "out.json"
    argv_backup = sys.argv
    sys.argv = [
        "parse_html_export.py",
        str(html_path),
        "--person",
        "サンプル太郎",
        "--out",
        str(out_path),
    ]
    try:
        parse_html_export.main()
    finally:
        sys.argv = argv_backup
    return json.loads(out_path.read_text(encoding="utf-8"))


def test_extracts_two_records_with_verbatim_text():
    with tempfile.TemporaryDirectory() as tmp:
        data = _run_parser(Path(tmp))
    records = data["records"]
    assert len(records) == 2
    first = records[0]
    assert first["treatmentDate"] == "2024-01-01"
    assert first["trainerName"] == "中野"
    assert first["location"] == "神楽坂"
    assert first["chiefComplaint"] == "通常セッションの主訴テキスト"
    assert first["physicalCheck"] == "四頭筋の張り"
    assert first["procedureContent"] == "オイルマッサージ"
    assert first["trainingContent"] == "スクワット20回×3set"
    assert first["memo"] == "次回も継続"
    assert first["resources"] == [{"path": "sample_export files/20240101_photo.jpg"}]


def test_same_date_different_content_both_kept():
    with tempfile.TemporaryDirectory() as tmp:
        data = _run_parser(Path(tmp))
    records = data["records"]
    same_date = [r for r in records if r["treatmentDate"] == "2024-01-01"]
    assert len(same_date) == 2
    complaints = {r["chiefComplaint"] for r in same_date}
    assert complaints == {"通常セッションの主訴テキスト", "怪我経過報告　フェーズ1"}


def test_non_session_note_is_diverted_to_unhandled_file():
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        _run_parser(tmp_path)
        unhandled_path = tmp_path / "サンプル太郎_unhandled.json"
        assert unhandled_path.exists()
        unhandled = json.loads(unhandled_path.read_text(encoding="utf-8"))
        assert len(unhandled) == 1
        assert unhandled[0]["title"] == "プロフィール"


if __name__ == "__main__":
    test_extracts_two_records_with_verbatim_text()
    test_same_date_different_content_both_kept()
    test_non_session_note_is_diverted_to_unhandled_file()
    print("すべてのテストが成功しました")
