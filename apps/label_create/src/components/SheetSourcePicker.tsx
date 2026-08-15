import { useState } from "react";
import type { ParsedTable } from "../lib/csv";
import { parseCsvText } from "../lib/csv";

interface Props {
  onLoaded: (table: ParsedTable, sourceLabel: string) => void;
}

type Mode = "file" | "sender";

const SENDER_HEADERS = ["氏名", "郵便番号", "住所", "電話番号"];

export function SheetSourcePicker({ onLoaded }: Props) {
  const [mode, setMode] = useState<Mode>("file");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [senderName, setSenderName] = useState("");
  const [senderPostalCode, setSenderPostalCode] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderCount, setSenderCount] = useState(12);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const table = file.name.toLowerCase().endsWith(".csv")
        ? parseCsvText(await file.text())
        : await (await import("../lib/excel")).parseExcelFile(file);
      if (table.headers.length === 0) {
        throw new Error("見出し行(1行目)が見つかりませんでした。");
      }
      onLoaded(table, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  function handleCreateSenderLabels() {
    setError(null);
    if (!senderName.trim()) {
      setError("差出人名を入力してください。");
      return;
    }
    const count = Math.max(1, Math.min(500, Math.floor(senderCount) || 1));
    const row: Record<string, string> = {
      氏名: senderName,
      郵便番号: senderPostalCode,
      住所: senderAddress,
      電話番号: senderPhone,
    };
    const table: ParsedTable = {
      headers: SENDER_HEADERS,
      rows: Array.from({ length: count }, () => ({ ...row })),
    };
    onLoaded(table, "差出人ラベル(手入力)");
  }

  return (
    <div className="panel">
      <div className="panel-title">1. データを読み込む</div>
      <div className="tabbar">
        <button className={mode === "file" ? "tab active" : "tab"} onClick={() => setMode("file")}>
          ファイルアップロード
        </button>
        <button className={mode === "sender" ? "tab active" : "tab"} onClick={() => setMode("sender")}>
          差出人ラベル
        </button>
      </div>

      {mode === "file" && (
        <div className="field-stack">
          <p className="hint">CSV または Excel(.xlsx)ファイルを選択してください。1行目は見出し(列名)にしてください。</p>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          {loading && <span className="hint">読み込み中…</span>}
        </div>
      )}

      {mode === "sender" && (
        <div className="field-stack">
          <p className="hint">
            送り主(差出人)の情報を1件入力し、必要な枚数分だけ同じ内容のラベルを作成します。荷物の送り元シールなどにお使いください。
          </p>
          <label className="field">
            <span>差出人名 / 団体名</span>
            <input
              type="text"
              className="text-input"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>郵便番号</span>
            <input
              type="text"
              className="text-input"
              placeholder="150-0001"
              value={senderPostalCode}
              onChange={(e) => setSenderPostalCode(e.target.value)}
            />
          </label>
          <label className="field">
            <span>住所</span>
            <input
              type="text"
              className="text-input"
              value={senderAddress}
              onChange={(e) => setSenderAddress(e.target.value)}
            />
          </label>
          <label className="field">
            <span>電話番号(任意)</span>
            <input
              type="text"
              className="text-input"
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
            />
          </label>
          <label className="field">
            <span>枚数</span>
            <input
              type="number"
              min={1}
              max={500}
              className="text-input"
              value={senderCount}
              onChange={(e) => setSenderCount(Number(e.target.value) || 1)}
            />
          </label>
          <button className="primary-button" onClick={handleCreateSenderLabels}>
            作成する
          </button>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}
    </div>
  );
}
