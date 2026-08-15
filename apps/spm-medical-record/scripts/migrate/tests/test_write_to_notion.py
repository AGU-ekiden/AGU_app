"""write_to_notion.py のオフラインテスト(Notion API呼び出しなし)。"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from write_to_notion import (  # noqa: E402
    build_properties,
    resolve_player,
    rich_text,
    sanitize_trainer_name,
)


def test_resolve_player_exact_match():
    players = [{"id": "p1", "name": "若林良樹"}, {"id": "p2", "name": "山田太郎"}]
    player_id, canonical_name, suggestions = resolve_player("若林良樹", players)
    assert player_id == "p1"
    assert canonical_name == "若林良樹"
    assert suggestions == []


def test_resolve_player_ignores_whitespace_differences():
    # 部員DBの登録名は全角スペース区切りだが、エクスポート元のフォルダ名はスペース無し、
    # というケースが実データで発生したため、空白を無視してマッチすることを確認する
    players = [{"id": "p1", "name": "中村　海斗"}]
    player_id, canonical_name, suggestions = resolve_player("中村海斗", players)
    assert player_id == "p1"
    # 書き込み時は部員DB側の正式な登録名(スペース付き)に統一される
    assert canonical_name == "中村　海斗"
    assert suggestions == []


def test_resolve_player_no_match_returns_suggestions():
    players = [{"id": "p1", "name": "若林良樹"}]
    player_id, canonical_name, suggestions = resolve_player("若林良機", players)  # 1文字違い
    assert player_id is None
    assert canonical_name is None
    assert "若林良樹" in suggestions


def test_resolve_player_ignores_kangxi_radical_lookalike_characters():
    # macOSでのエクスポートで、一部の漢字(山/人など)が見た目は同じでもUnicode上は
    # 「部首(Kangxi Radical)」用の別コードポイントに化けていたケースが実データにあった
    players = [{"id": "p1", "name": "片山　宗哉"}]
    kangxi_variant_name = "⽚⼭ 宗哉"  # "⽚⼭ 宗哉" (⽚=U+2F5A, ⼭=U+2F2D)
    player_id, canonical_name, suggestions = resolve_player(kangxi_variant_name, players)
    assert player_id == "p1"
    assert canonical_name == "片山　宗哉"
    assert suggestions == []


def test_sanitize_trainer_name_moves_invalid_value_to_memo():
    valid_trainers = {"中野", "古谷", "木村"}
    record = {"trainerName": "青学MTG　議事録", "memo": "既存のメモ"}
    sanitize_trainer_name(record, valid_trainers)
    assert record["trainerName"] == ""
    assert "青学MTG　議事録" in record["memo"]
    assert "既存のメモ" in record["memo"]
    assert record["_trainerNameSanitized"] == "青学MTG　議事録"


def test_sanitize_trainer_name_leaves_valid_value_untouched():
    valid_trainers = {"中野", "古谷", "木村"}
    record = {"trainerName": "中野", "memo": ""}
    sanitize_trainer_name(record, valid_trainers)
    assert record["trainerName"] == "中野"
    assert record["memo"] == ""
    assert "_trainerNameSanitized" not in record


def test_sanitize_trainer_name_leaves_blank_untouched():
    valid_trainers = {"中野", "古谷", "木村"}
    record = {"trainerName": "", "memo": ""}
    sanitize_trainer_name(record, valid_trainers)
    assert record["trainerName"] == ""
    assert "_trainerNameSanitized" not in record


def test_build_properties_maps_all_fields():
    record = {
        "clientName": "若林良樹",
        "chiefComplaint": "疲労度10",
        "physicalCheck": "四頭筋の張りが強い。",
        "procedureContent": "オイルマッサージ",
        "trainingContent": "①エロンゲーション",
        "memo": "次回はもう少し負荷を上げる",
        "tags": ["リハビリ", "ケア中心"],
        "trainerName": "中野",
        "location": "神楽坂",
        "treatmentDate": "2024-01-15",
    }
    props = build_properties(record, "player-id-123")

    assert props["クライアント名"]["title"][0]["text"]["content"] == "若林良樹"
    assert props["主訴"]["rich_text"][0]["text"]["content"] == "疲労度10"
    assert props["部員"]["relation"] == [{"id": "player-id-123"}]
    assert props["担当トレーナー名"] == {"select": {"name": "中野"}}
    assert props["場所"] == {"select": {"name": "神楽坂"}}
    assert props["施術日"] == {"date": {"start": "2024-01-15"}}
    assert props["タグ"]["multi_select"] == [{"name": "リハビリ"}, {"name": "ケア中心"}]


def test_build_properties_omits_optional_fields_when_empty():
    record = {
        "clientName": "若林良樹",
        "chiefComplaint": "",
        "physicalCheck": "",
        "procedureContent": "",
        "trainingContent": "",
        "memo": "",
        "tags": [],
        "trainerName": "",
        "location": "",
        "treatmentDate": None,
    }
    props = build_properties(record, "player-id-123")
    assert "担当トレーナー名" not in props
    assert "場所" not in props
    assert "施術日" not in props
    assert "メディア" not in props


def test_rich_text_splits_long_content_into_2000_char_chunks():
    long_text = "あ" * 4500
    chunks = rich_text(long_text)
    assert len(chunks) == 3
    assert sum(len(c["text"]["content"]) for c in chunks) == 4500
    # 元のテキストを分割・連結しても文字が壊れていないこと
    assert "".join(c["text"]["content"] for c in chunks) == long_text


if __name__ == "__main__":
    test_resolve_player_exact_match()
    test_resolve_player_ignores_whitespace_differences()
    test_resolve_player_no_match_returns_suggestions()
    test_resolve_player_ignores_kangxi_radical_lookalike_characters()
    test_sanitize_trainer_name_moves_invalid_value_to_memo()
    test_sanitize_trainer_name_leaves_valid_value_untouched()
    test_sanitize_trainer_name_leaves_blank_untouched()
    test_build_properties_maps_all_fields()
    test_build_properties_omits_optional_fields_when_empty()
    test_rich_text_splits_long_content_into_2000_char_chunks()
    print("すべてのテストが成功しました")
