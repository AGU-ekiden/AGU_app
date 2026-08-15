"""classify.py のオフラインテスト(Anthropic API呼び出しなし)。

reconstruct_record が「モデルの返した番号どおりに元の段落を連結するだけで、
テキストを書き換えない」ことを検証する。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from classify import reconstruct_record  # noqa: E402


def test_reconstruct_record_uses_original_paragraphs_verbatim():
    note = {
        "title": "1/15 若林",
        "sourceIndex": 0,
        "created": "2024-01-15T09:30:00Z",
        "paragraphs": [
            "小山町合宿で右膝の滑液包炎が少し悪化している。",
            "疲労度10",
            "四頭筋の張りが強い。",
            "オイルマッサージ",
            "①エロンゲーション　Level9",
            "次回はもう少し負荷を上げる",
        ],
        "resources": [],
    }
    classification = {
        "treatmentDate": None,
        "trainerName": "中野",
        "location": "神楽坂",
        "tags": ["リハビリ"],
        "fields": {
            "chiefComplaint": [0, 1],
            "physicalCheck": [2],
            "procedureContent": [3],
            "trainingContent": [4],
            "memo": [5],
        },
    }

    record = reconstruct_record(note, classification, "若林良樹")

    # 原文と完全一致していること(retypeされていないこと)を確認
    assert record["chiefComplaint"] == "小山町合宿で右膝の滑液包炎が少し悪化している。\n疲労度10"
    assert record["physicalCheck"] == "四頭筋の張りが強い。"
    assert record["procedureContent"] == "オイルマッサージ"
    assert record["trainingContent"] == "①エロンゲーション　Level9"
    assert record["memo"] == "次回はもう少し負荷を上げる"
    assert record["trainerName"] == "中野"
    assert record["location"] == "神楽坂"
    assert record["tags"] == ["リハビリ"]
    # 本文中に明示日付が無いのでノート作成日にフォールバック
    assert record["treatmentDate"] == "2024-01-15"


def test_reconstruct_record_ignores_out_of_range_and_invalid_indices():
    note = {
        "title": "note",
        "sourceIndex": 1,
        "created": "2024-02-01T00:00:00Z",
        "paragraphs": ["段落A", "段落B"],
        "resources": [],
    }
    classification = {
        "treatmentDate": "2024-02-02",
        "trainerName": None,
        "location": None,
        "tags": "not-a-list",
        "fields": {
            "chiefComplaint": [0, 99, "bogus"],
            "physicalCheck": [],
            "procedureContent": [],
            "trainingContent": [1],
            "memo": [],
        },
    }

    record = reconstruct_record(note, classification, "テスト太郎")

    assert record["chiefComplaint"] == "段落A"
    assert record["trainingContent"] == "段落B"
    assert record["tags"] == []
    # 本文中の明示日付を優先
    assert record["treatmentDate"] == "2024-02-02"


def test_reconstruct_record_preserves_paragraph_order_regardless_of_model_order():
    note = {
        "title": "note",
        "sourceIndex": 2,
        "created": "2024-03-01T00:00:00Z",
        "paragraphs": ["1つ目", "2つ目", "3つ目"],
        "resources": [],
    }
    classification = {
        "treatmentDate": None,
        "trainerName": None,
        "location": None,
        "tags": [],
        # モデルが順不同(2,0)で返してきても、本文の出現順(0,2)で連結する
        "fields": {
            "chiefComplaint": [2, 0],
            "physicalCheck": [],
            "procedureContent": [],
            "trainingContent": [],
            "memo": [],
        },
    }

    record = reconstruct_record(note, classification, "テスト太郎")
    assert record["chiefComplaint"] == "1つ目\n3つ目"


if __name__ == "__main__":
    test_reconstruct_record_uses_original_paragraphs_verbatim()
    test_reconstruct_record_ignores_out_of_range_and_invalid_indices()
    test_reconstruct_record_preserves_paragraph_order_regardless_of_model_order()
    print("すべてのテストが成功しました")
