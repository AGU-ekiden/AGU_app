"""common.py のオフラインテスト(実際のNotion/Anthropic API呼び出しなし)。

notion_request / anthropic_messages が、429だけでなく一時的な接続エラー
(タイムアウト・接続切断など)や5xxエラーもリトライすることを確認する。
数百人規模の連続実行では実際にこの種のエラーが発生したため。
"""

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("NOTION_TOKEN", "test-token")

import common  # noqa: E402


def _fake_response(status_code: int, json_body=None, headers=None):
    resp = MagicMock()
    resp.status_code = status_code
    resp.ok = 200 <= status_code < 300
    resp.headers = headers or {}
    resp.text = "error body"
    resp.json.return_value = json_body or {}
    return resp


def test_notion_request_retries_on_connection_error_then_succeeds():
    ok_response = _fake_response(200, json_body={"results": []})
    with patch.object(common.requests, "request", side_effect=[requests.exceptions.ConnectionError("boom"), ok_response]) as mock_request, \
         patch.object(common.time, "sleep") as mock_sleep:
        result = common.notion_request("GET", "/x")
    assert result == {"results": []}
    assert mock_request.call_count == 2
    mock_sleep.assert_called_once()


def test_notion_request_retries_on_500_then_succeeds():
    responses = [_fake_response(500), _fake_response(200, json_body={"ok": True})]
    with patch.object(common.requests, "request", side_effect=responses), \
         patch.object(common.time, "sleep"):
        result = common.notion_request("GET", "/x")
    assert result == {"ok": True}


def test_notion_request_retries_on_429_then_succeeds():
    responses = [_fake_response(429, headers={"Retry-After": "0"}), _fake_response(200, json_body={"ok": True})]
    with patch.object(common.requests, "request", side_effect=responses), \
         patch.object(common.time, "sleep"):
        result = common.notion_request("GET", "/x")
    assert result == {"ok": True}


def test_notion_request_raises_after_exhausting_retries():
    with patch.object(common.requests, "request", side_effect=requests.exceptions.ReadTimeout("timed out")), \
         patch.object(common.time, "sleep"):
        try:
            common.notion_request("GET", "/x", max_retries=3)
            raise AssertionError("例外が発生しませんでした")
        except RuntimeError as e:
            assert "3回連続で失敗" in str(e)


def test_notion_request_does_not_retry_on_4xx_client_error():
    with patch.object(common.requests, "request", return_value=_fake_response(400)) as mock_request, \
         patch.object(common.time, "sleep") as mock_sleep:
        try:
            common.notion_request("GET", "/x")
            raise AssertionError("例外が発生しませんでした")
        except RuntimeError:
            pass
    # 4xx(429以外)はリトライ対象ではないので1回で終わる
    assert mock_request.call_count == 1
    mock_sleep.assert_not_called()


if __name__ == "__main__":
    test_notion_request_retries_on_connection_error_then_succeeds()
    test_notion_request_retries_on_500_then_succeeds()
    test_notion_request_retries_on_429_then_succeeds()
    test_notion_request_raises_after_exhausting_retries()
    test_notion_request_does_not_retry_on_4xx_client_error()
    print("すべてのテストが成功しました")
