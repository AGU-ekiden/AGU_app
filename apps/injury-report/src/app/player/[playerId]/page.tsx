"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiPath } from "@/lib/api-path";
import { InjuryReportRecord } from "@/types/injury";

export default function PlayerHistoryPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const [reports, setReports] = useState<InjuryReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiPath(`/api/reports/by-player?playerId=${encodeURIComponent(playerId)}`));
        if (!res.ok) throw new Error("取得に失敗しました");
        setReports(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [playerId]);

  const playerName = reports[0]?.playerName.split(" ")[0] ?? "";

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-16 pb-10 flex flex-col gap-4">
      <Link href="/dashboard" className="text-sm text-[#2c6462] font-bold">
        ← 一覧へ戻る
      </Link>
      <header>
        <h1 className="text-lg font-bold text-[#2c6462]">{playerName || "選手"}の報告履歴</h1>
      </header>

      {loading && <p className="text-sm text-gray-400">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && reports.length === 0 && (
        <p className="text-sm text-gray-400">報告がありません</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="py-2 pr-3">報告日</th>
              <th className="py-2 pr-3">ステージ</th>
              <th className="py-2 pr-3">痛みのある個所</th>
              <th className="py-2 pr-3">走行距離</th>
              <th className="py-2 pr-3">故障開始日</th>
              <th className="py-2 pr-3">ポイント合流日</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b border-gray-100">
                <td className="py-2 pr-3 whitespace-nowrap font-bold">{r.reportDate}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.stage}</td>
                <td className="py-2 pr-3">{r.painLocations.join("・") || "-"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.weeklyDistance != null ? `${r.weeklyDistance}km` : "-"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.injuryStartDate || "-"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.pointRejoinDate || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
