"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiPath } from "@/lib/api-path";
import { InjuryReportRecord, stageNumber } from "@/types/injury";

export default function DashboardPage() {
  const [reports, setReports] = useState<InjuryReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiPath("/api/reports/recent"));
        if (!res.ok) throw new Error("取得に失敗しました");
        setReports(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 週次ログなので、選手ごとに最新の報告だけを「現在地点」として表示する。
  const latestByPlayer = useMemo(() => {
    const map = new Map<string, InjuryReportRecord>();
    for (const r of reports) {
      if (!r.playerId) continue;
      const existing = map.get(r.playerId);
      if (!existing || r.reportDate > existing.reportDate) map.set(r.playerId, r);
    }
    return Array.from(map.values()).sort((a, b) => {
      const sa = stageNumber(a.stage) ?? 99;
      const sb = stageNumber(b.stage) ?? 99;
      return sa - sb;
    });
  }, [reports]);

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-16 pb-10 flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-bold text-[#2c6462]">故障者報告確認</h1>
        <p className="text-sm text-gray-500">直近2週間に報告のあった選手(ステージが低い=重い順)</p>
      </header>

      {loading && <p className="text-sm text-gray-400">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && latestByPlayer.length === 0 && (
        <p className="text-sm text-gray-400">直近の報告はありません</p>
      )}

      <ul className="flex flex-col gap-2">
        {latestByPlayer.map((r) => (
          <li key={r.playerId}>
            <Link
              href={`/player/${r.playerId}`}
              className="block rounded-md border border-gray-200 px-4 py-3 hover:bg-[#eaf5f4]"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800">{r.playerName.split(" ")[0]}</span>
                <span className="rounded-full bg-[#eaf5f4] px-2.5 py-1 text-xs font-bold text-[#2c6462]">
                  {r.stage}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                報告日: {r.reportDate} / {r.painLocations.join("・") || "部位未選択"}
                {r.weeklyDistance != null ? ` / ${r.weeklyDistance}km` : ""}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
