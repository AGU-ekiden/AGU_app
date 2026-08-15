"""batch_migrate.py のオフラインテスト(サブプロセス実行やNotion API呼び出しなし)。

find_person_dirs のフォルダ探索ロジックのみを対象にする。
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from batch_migrate import find_person_dirs  # noqa: E402


def test_finds_html_matching_folder_name():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "中村海斗").mkdir()
        (root / "中村海斗" / "中村海斗.html").write_text("<html></html>", encoding="utf-8")
        (root / "若林良樹").mkdir()
        (root / "若林良樹" / "若林良樹.html").write_text("<html></html>", encoding="utf-8")

        pairs = find_person_dirs(root)
        names = sorted(name for name, _ in pairs)
        assert names == ["中村海斗", "若林良樹"]


def test_falls_back_to_sole_html_file_when_name_differs():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "person_a").mkdir()
        (root / "person_a" / "エクスポート済み.html").write_text("<html></html>", encoding="utf-8")

        pairs = find_person_dirs(root)
        assert len(pairs) == 1
        name, path = pairs[0]
        assert name == "エクスポート済み"
        assert path.name == "エクスポート済み.html"


def test_skips_folder_with_no_html():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "empty_person").mkdir()

        pairs = find_person_dirs(root)
        assert pairs == []


def test_skips_folder_with_ambiguous_html_files():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "ambiguous").mkdir()
        (root / "ambiguous" / "a.html").write_text("<html></html>", encoding="utf-8")
        (root / "ambiguous" / "b.html").write_text("<html></html>", encoding="utf-8")

        pairs = find_person_dirs(root)
        assert pairs == []


def test_ignores_non_directory_entries():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "readme.txt").write_text("not a person folder", encoding="utf-8")
        (root / "中村海斗").mkdir()
        (root / "中村海斗" / "中村海斗.html").write_text("<html></html>", encoding="utf-8")

        pairs = find_person_dirs(root)
        assert len(pairs) == 1
        assert pairs[0][0] == "中村海斗"


def test_finds_html_inside_extra_nested_same_name_folder():
    # zip展開時などに <氏名>/<氏名>/<氏名>.html のように余分な階層ができてしまうケース
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        nested = root / "飯田翔大" / "飯田翔大"
        nested.mkdir(parents=True)
        (nested / "飯田翔大.html").write_text("<html></html>", encoding="utf-8")
        (nested / "飯田翔大 files").mkdir()
        (nested / "飯田翔大 files" / "photo.jpg").write_bytes(b"fake")

        pairs = find_person_dirs(root)
        assert len(pairs) == 1
        name, path = pairs[0]
        assert name == "飯田翔大"
        assert path == nested / "飯田翔大.html"


def test_ignores_html_files_inside_attachment_folders():
    # 添付ファイル用フォルダの中にたまたま.htmlファイルが紛れ込んでいても無視する
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        person_dir = root / "person_b"
        person_dir.mkdir()
        (person_dir / "person_b files").mkdir()
        (person_dir / "person_b files" / "stray.html").write_text("<html></html>", encoding="utf-8")
        (person_dir / "person_b.html").write_text("<html></html>", encoding="utf-8")

        pairs = find_person_dirs(root)
        assert len(pairs) == 1
        assert pairs[0][0] == "person_b"


if __name__ == "__main__":
    test_finds_html_matching_folder_name()
    test_falls_back_to_sole_html_file_when_name_differs()
    test_skips_folder_with_no_html()
    test_skips_folder_with_ambiguous_html_files()
    test_ignores_non_directory_entries()
    test_finds_html_inside_extra_nested_same_name_folder()
    test_ignores_html_files_inside_attachment_folders()
    print("すべてのテストが成功しました")
