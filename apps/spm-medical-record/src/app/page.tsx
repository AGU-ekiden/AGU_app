"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KarteRecord, PlayerInfo, MedicalKarteRecord } from "@/types/karte";

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

type RecentItem =
  | { kind: "physical"; data: KarteRecord }
  | { kind: "medical"; data: MedicalKarteRecord };

export default function PlayerListPage() {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [allRecent, setAllRecent] = useState<RecentItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [activeTab, setActiveTab] = useState<"players" | "recent">("players");
  const [quickViewItem, setQuickViewItem] = useState<RecentItem | null>(null);

  useEffect(() => {
    fetch("/api/players")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setPlayers)
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    Promise.all([
      fetch("/api/karte/recent").then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/medical-karte/recent").then((r) => r.ok ? r.json() : []).catch(() => []),
    ]).then(([physical, medical]) => {
      const merged: RecentItem[] = [
        ...(physical as KarteRecord[]).map((d) => ({ kind: "physical" as const, data: d })),
        ...(medical as MedicalKarteRecord[]).map((d) => ({ kind: "medical" as const, data: d })),
      ].sort((a, b) => b.data.createdAt.localeCompare(a.data.createdAt));
      setAllRecent(merged);
    }).finally(() => setLoadingRecent(false));
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
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-gray-800">選手一覧</h2>
        <Link
          href="/obog"
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 bg-white border border-gray-200 hover:border-blue-300 rounded-full pl-3 pr-2.5 py-1.5 transition-colors shrink-0"
        >
          OB・OG
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
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
                    <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                      {player.name}
                    </p>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <h2 className="text-sm font-bold text-gray-700">最近の記録</h2>
        <span className="text-[10px] font-semibold bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full border border-orange-100">
          直近6日
        </span>
      </div>

      {loadingRecent ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : allRecent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-300 gap-2">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-xs">直近6日の記録はありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {allRecent.map((item) => (
            <button
              key={item.data.id}
              type="button"
              onClick={() => setQuickViewItem(item)}
              className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow text-left w-full"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold ${
                    item.kind === "physical" ? "text-orange-400" : "text-green-500"
                  }`}>
                    {formatRelativeDate(item.data.createdAt)}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                    item.kind === "physical"
                      ? "bg-blue-50 text-blue-600 border-blue-100"
                      : "bg-green-50 text-green-600 border-green-100"
                  }`}>
                    {item.kind === "physical" ? "フィジカル" : "メディカル"}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">{formatDate(item.data.createdAt)}</span>
              </div>

              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-semibold text-sm text-gray-800">{item.data.clientName}</span>
                <span className="text-xs text-gray-400">{item.data.trainerName}</span>
              </div>

              {item.kind === "physical" ? (
                <>
                  {item.data.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {item.data.tags.map((tag) => (
                        <span key={tag} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium border border-blue-100">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.data.trainingContent && (
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                      {item.data.trainingContent}
                    </p>
                  )}
                </>
              ) : (
                <>
                  {item.data.chiefComplaint && (
                    <p className="text-[11px] text-gray-500 line-clamp-1 leading-relaxed mb-1">
                      <span className="font-semibold text-orange-500">主訴: </span>{item.data.chiefComplaint}
                    </p>
                  )}
                  <div className="flex gap-1.5 flex-wrap">
                    {item.data.acupuncturePresent && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                        item.data.acupuncturePresent === "あり"
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}>
                        针{item.data.acupuncturePresent}
                      </span>
                    )}
                    {item.data.treatmentScope && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                        item.data.treatmentScope === "全身治療"
                          ? "bg-blue-50 text-blue-600 border-blue-200"
                          : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }`}>
                        {item.data.treatmentScope}
                      </span>
                    )}
                  </div>
                </>
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
        <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold">S</div>
        <div>
          <h1 className="text-base font-bold text-gray-800 leading-tight">SPM カルテシステム</h1>
          <p className="text-xs text-gray-400">青山学院陸上部</p>
        </div>
      </header>

      <div className="md:hidden flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("players")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "players" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400"
          }`}
        >
          選手一覧
        </button>
        <button
          onClick={() => setActiveTab("recent")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === "recent" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400"
          }`}
        >
          最新の記録
          {allRecent.length > 0 && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              activeTab === "recent" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
            }`}>
              {allRecent.length}
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

      {quickViewItem && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4"
          onClick={() => setQuickViewItem(null)}
        >
          <div
            className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-sm font-bold text-gray-800">{quickViewItem.data.clientName}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                    quickViewItem.kind === "physical"
                      ? "bg-blue-50 text-blue-600 border-blue-100"
                      : "bg-green-50 text-green-600 border-green-100"
                  }`}>
                    {quickViewItem.kind === "physical" ? "フィジカル" : "メディカル"}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {formatDate(quickViewItem.data.createdAt)} {formatTime(quickViewItem.data.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setQuickViewItem(null)}
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
                <span className="text-sm font-semibold text-gray-700">{quickViewItem.data.trainerName}</span>
              </div>

              {quickViewItem.kind === "physical" ? (
                <>
                  {quickViewItem.data.location && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">場所</span>
                      <span className="text-sm font-semibold text-gray-700">{quickViewItem.data.location}</span>
                    </div>
                  )}

                  {quickViewItem.data.tags.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">タグ</p>
                      <div className="flex flex-wrap gap-1">
                        {quickViewItem.data.tags.map((tag) => (
                          <span key={tag} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium border border-blue-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {quickViewItem.data.trainingContent && (
                    <div>
                      <p className="text-xs font-semibold text-blue-500 mb-0.5">トレーニング内容</p>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {quickViewItem.data.trainingContent}
                      </p>
                    </div>
                  )}

                  {quickViewItem.data.chiefComplaint && (
                    <div>
                      <p className="text-xs font-semibold text-orange-500 mb-0.5">主訴</p>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {quickViewItem.data.chiefComplaint}
                      </p>
                    </div>
                  )}

                  {quickViewItem.data.physicalCheck && (
                    <div>
                      <p className="text-xs font-semibold text-purple-500 mb-0.5">状態（フィジカルチェック）</p>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {quickViewItem.data.physicalCheck}
                      </p>
                    </div>
                  )}

                  {quickViewItem.data.procedureContent && (
                    <div>
                      <p className="text-xs font-semibold text-teal-500 mb-0.5">実施内容</p>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {quickViewItem.data.procedureContent}
                      </p>
                    </div>
                  )}

                  {quickViewItem.data.memo && (
                    <div>
                      <p className="text-xs font-semibold text-green-500 mb-0.5">memo</p>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {quickViewItem.data.memo}
                      </p>
                    </div>
                  )}

                  {quickViewItem.data.mediaUrls && quickViewItem.data.mediaUrls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {quickViewItem.data.mediaUrls.map((url, i) => {
                        const isVideo = /\.(mp4|mov|webm|avi)(\?|$)/i.test(url);
                        return isVideo ? (
                          <video
                            key={i}
                            src={url}
                            className="w-20 h-16 object-cover rounded-lg border border-gray-100"
                            controls
                            preload="metadata"
                          />
                        ) : (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt=""
                              className="w-20 h-16 object-cover rounded-lg border border-gray-100 hover:opacity-90 transition-opacity"
                            />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {quickViewItem.data.chiefComplaint && (
                    <div>
                      <p className="text-xs font-semibold text-orange-500 mb-0.5">主訴</p>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {quickViewItem.data.chiefComplaint}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">针治療</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                        quickViewItem.data.acupuncturePresent === "あり"
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}>
                        {quickViewItem.data.acupuncturePresent || "なし"}
                      </span>
                      {quickViewItem.data.acupuncturePresent === "あり" && quickViewItem.data.acupunctureLocation && (
                        <span className="text-[10px] text-gray-600">{quickViewItem.data.acupunctureLocation}</span>
                      )}
                    </div>
                  </div>

                  {quickViewItem.data.treatmentScope && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-0.5">治療範囲</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                        quickViewItem.data.treatmentScope === "全身治療"
                          ? "bg-blue-50 text-blue-600 border-blue-200"
                          : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }`}>
                        {quickViewItem.data.treatmentScope}
                      </span>
                    </div>
                  )}

                  {quickViewItem.data.overallAssessment && (
                    <div>
                      <p className="text-xs font-semibold text-green-500 mb-0.5">総評</p>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {quickViewItem.data.overallAssessment}
                      </p>
                    </div>
                  )}
                </>
              )}

              {quickViewItem.data.playerId && (
                <Link
                  href={`/player/${quickViewItem.data.playerId}`}
                  className="mt-1 text-center text-sm text-blue-600 font-semibold hover:underline"
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
