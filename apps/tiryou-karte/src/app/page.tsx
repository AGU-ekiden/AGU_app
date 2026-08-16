"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KarteRecord, PlayerInfo } from "@/types/karte";
import { apiPath } from "@/lib/api-path";

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function formatRelativeDate(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "昨日";
  return `${diffDays}日前`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

const GRADE_ORDER = ["1年", "2年", "3年", "4年"];

export default function PlayerListPage() {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recentKartes, setRecentKartes] = useState<KarteRecord[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [activeTab, setActiveTab] = useState<"players" | "recent">("players");
  const [quickViewKarte, setQuickViewKarte] = useState<KarteRecord | null>(null);

  useEffect(() => {
    fetch(apiPath("/api/players"))
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setPlayers)
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    fetch(apiPath("/api/karte/recent"))
      .then((r) => r.ok ? r.json() : [])
      .then(setRecentKartes)
      .catch(() => {})
      .finally(() => setLoadingRecent(false));
  }, []);

  const grouped = players.reduce<Record<string, PlayerInfo[]>>((acc, p) => {
    const key = p.grade ?? "その他";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const grades = [
    ...GRADE_ORDER.filter((g) => grouped[g]),
    ...Object.keys(grouped).filter((g) => !GRADE_ORDER.includes(g)),
  ];

  const playersPanel = (
    <div className="min-w-0">
      <h2 className="text-lg font-bold text-gray-800 mb-4">選手一覧</h2>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        <p className="text-sm text-red-400 text-center py-8">選手一覧の読み込みに失敗しました</p>
      ) : players.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">選手データが見つかりません</p>
      ) : (
        <div className="flex flex-col gap-6 md:grid md:grid-cols-4 md:gap-4 md:items-start">
          {grades.map((grade) => (
            <div key={grade}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">{grade}</p>
              <div className="flex flex-col gap-2">
                {grouped[grade].map((player) => (
                  <Link
                    key={player.id}
                    href={`/player/${player.id}`}
                    className="bg-white border border-gray-100 rounded-xl px-5 py-3.5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group"
                  >
                    <p className="font-semibold text-gray-800 group-hover:text-green-600 transition-colors">
                      {player.name}
                    </p>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const recentPanel = (
    <div className="min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-bold text-gray-700">最近のカルテ</h2>
        <span className="text-[10px] font-semibold bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-100">
          直近6日
        </span>
      </div>

      {loadingRecent ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : recentKartes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-300 gap-2">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-xs">直近6日のカルテはありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {recentKartes.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setQuickViewKarte(r)}
              className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow text-left w-full"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-green-500">{formatRelativeDate(r.createdAt)}</span>
                <span className="text-[10px] text-gray-400">{formatDate(r.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-semibold text-sm text-gray-800">{r.clientName}</span>
                <span className="text-xs text-gray-400">{r.trainerName}</span>
              </div>
              {r.treatmentScope && (
                <span className="inline-block text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-medium border border-green-100 mb-1.5">
                  {r.treatmentScope}
                </span>
              )}
              {r.chiefComplaint && (
                <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                  {r.chiefComplaint}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shadow-sm">
        <div className="bg-green-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold">S</div>
        <div>
          <h1 className="text-base font-bold text-gray-800 leading-tight">メディカルカルテシステム</h1>
          <p className="text-xs text-gray-400">青山学院陸上部</p>
        </div>
      </header>

      <div className="md:hidden flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("players")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "players" ? "border-green-600 text-green-600" : "border-transparent text-gray-400"
          }`}
        >
          選手一覧
        </button>
        <button
          onClick={() => setActiveTab("recent")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === "recent" ? "border-green-600 text-green-600" : "border-transparent text-gray-400"
          }`}
        >
          最新のカルテ
          {recentKartes.length > 0 && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              activeTab === "recent" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
            }`}>
              {recentKartes.length}
            </span>
          )}
        </button>
      </div>

      <main className="max-w-5xl mx-auto w-full px-4 py-6">
        <div className="md:hidden">
          {activeTab === "players" ? playersPanel : recentPanel}
        </div>

        <div className="hidden md:flex md:gap-8 md:items-start">
          <div className="flex-1">{playersPanel}</div>
          <div className="md:w-72 md:shrink-0">{recentPanel}</div>
        </div>
      </main>

      {quickViewKarte && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4"
          onClick={() => setQuickViewKarte(null)}
        >
          <div
            className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <p className="text-sm font-bold text-gray-800">{quickViewKarte.clientName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(quickViewKarte.createdAt)} {formatTime(quickViewKarte.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setQuickViewKarte(null)}
                className="text-gray-400 hover:text-gray-600 p-1 -m-1"
                aria-label="閉じる"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400">担当トレーナー</span>
                <span className="text-sm font-semibold text-gray-700">{quickViewKarte.trainerName}</span>
              </div>

              {quickViewKarte.chiefComplaint && (
                <div>
                  <p className="text-xs font-semibold text-orange-500 mb-0.5">主訴</p>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {quickViewKarte.chiefComplaint}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">針治療の有無</p>
                  {quickViewKarte.needleTreatment ? (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        quickViewKarte.needleTreatment === "あり"
                          ? "bg-red-50 text-red-500 border-red-100"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      {quickViewKarte.needleTreatment}
                    </span>
                  ) : (
                    <p className="text-xs text-gray-300">—</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">治療範囲</p>
                  {quickViewKarte.treatmentScope ? (
                    <span className="text-[10px] font-semibold bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full">
                      {quickViewKarte.treatmentScope}
                    </span>
                  ) : (
                    <p className="text-xs text-gray-300">—</p>
                  )}
                </div>
              </div>

              {quickViewKarte.needleTreatment === "あり" && quickViewKarte.needleLocation && (
                <div>
                  <p className="text-xs font-semibold text-red-500 mb-0.5">針治療の箇所</p>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {quickViewKarte.needleLocation}
                  </p>
                </div>
              )}

              {quickViewKarte.overallAssessment && (
                <div>
                  <p className="text-xs font-semibold text-green-500 mb-0.5">総評</p>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {quickViewKarte.overallAssessment}
                  </p>
                </div>
              )}

              {quickViewKarte.playerId && (
                <Link
                  href={`/player/${quickViewKarte.playerId}`}
                  className="mt-1 text-center text-sm text-green-600 font-semibold hover:underline"
                >
                  選手ページを開く →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
