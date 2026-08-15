"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ObogPlayerInfo } from "@/types/karte";

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export default function ObogListPage() {
  const [players, setPlayers] = useState<ObogPlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/obog")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setPlayers)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // 入学年ごとにまとめる（新しい代が先頭）
  const years = useMemo(() => {
    const set = new Set(players.map((p) => p.entranceYear));
    return Array.from(set).sort((a, b) => b - a);
  }, [players]);

  const activeYear = selectedYear ?? years[0] ?? null;
  const shown = useMemo(
    () => players.filter((p) => p.entranceYear === activeYear),
    [players, activeYear]
  );

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-600 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            選手一覧
          </Link>
          <span className="text-gray-200">/</span>
          <h1 className="font-bold text-gray-800">OB・OG</h1>
          {!loading && !error && (
            <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {players.length}名
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : error ? (
          <p className="text-sm text-red-400 text-center py-12">OB・OGの読み込みに失敗しました</p>
        ) : players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300 gap-2">
            <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm">生年月日が登録されているOB・OGがいません</p>
          </div>
        ) : (
          <>
            {/* 入学年の選択 */}
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">入学年</p>
              <div className="flex flex-wrap gap-1.5">
                {years.map((year) => {
                  const count = players.filter((p) => p.entranceYear === year).length;
                  const isActive = year === activeYear;
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setSelectedYear(year)}
                      className={`text-sm px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600 font-semibold"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                      }`}
                    >
                      {year}年
                      <span className={`text-[10px] ${isActive ? "text-blue-100" : "text-gray-400"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 選択した代の一覧 */}
            <div className="flex items-baseline gap-2 mb-2.5">
              <h2 className="text-base font-bold text-gray-700">{activeYear}年入学</h2>
              <span className="text-xs text-gray-400">{shown.length}名</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {shown.map((player) => (
                <Link
                  key={player.id}
                  href={`/player/${player.id}`}
                  className="bg-white border border-gray-100 rounded-xl px-4 py-3.5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between gap-2 group min-w-0"
                >
                  <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors truncate">
                    {player.name}
                  </p>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
