"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BloodTestRecord, InBodyRecord, KarteFormData, KarteRecord, PersonalKarteRecord, PlayerInfo, RaceResult } from "@/types/karte";
import KarteForm from "@/components/KarteForm";
import PlayerProfileForm from "@/components/PlayerProfileForm";
import BloodTestTrendTable from "@/components/BloodTestTrendTable";
import MedicalKarteCard from "@/components/MedicalKarteCard";
import PersonalKarteCard from "@/components/PersonalKarteCard";
import RaceResultCard from "@/components/RaceResultCard";
import BloodTestCard from "@/components/BloodTestCard";
import InBodyCard from "@/components/InBodyCard";
import MiniCalendar from "@/components/MiniCalendar";

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

type HistoryItem =
  | { type: "medical"; sortKey: string; data: KarteRecord }
  | { type: "personal"; sortKey: string; data: PersonalKarteRecord }
  | { type: "race"; sortKey: string; data: RaceResult }
  | { type: "blood"; sortKey: string; data: BloodTestRecord }
  | { type: "inbody"; sortKey: string; data: InBodyRecord };

type FormTab = "medical" | "profile";

export default function KarteRecordPage() {
  const params = useParams();
  const playerId = params.playerId as string;

  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [records, setRecords] = useState<KarteRecord[]>([]);
  const [personalRecords, setPersonalRecords] = useState<PersonalKarteRecord[]>([]);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [bloodRecords, setBloodRecords] = useState<BloodTestRecord[]>([]);
  const [inbodyRecords, setInbodyRecords] = useState<InBodyRecord[]>([]);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [formTab, setFormTab] = useState<FormTab>("medical");
  const [editingKarte, setEditingKarte] = useState<KarteRecord | null>(null);

  const karteDates = records.map((r) => r.createdAt.slice(0, 10));
  const personalDates = personalRecords.map((r) => r.createdAt.slice(0, 10));
  const raceDates = raceResults.map((r) => r.date).filter(Boolean);
  const bloodDates = bloodRecords.map((r) => r.testDate).filter(Boolean);
  const inbodyDates = inbodyRecords.map((r) => r.measuredDate).filter(Boolean);

  const karteIndexMap = new Map(
    records
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((k, i) => [k.id, i])
  );

  const allItems: HistoryItem[] = [
    ...records.map((r) => ({ type: "medical" as const, sortKey: r.createdAt, data: r })),
    ...personalRecords.map((r) => ({ type: "personal" as const, sortKey: r.createdAt, data: r })),
    ...raceResults.map((r) => ({ type: "race" as const, sortKey: r.date, data: r })),
    ...bloodRecords.map((r) => ({ type: "blood" as const, sortKey: r.testDate, data: r })),
    ...inbodyRecords.map((r) => ({ type: "inbody" as const, sortKey: r.measuredDate, data: r })),
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  useEffect(() => {
    fetch(`/api/players/${playerId}`)
      .then((r) => r.json())
      .then(setPlayer)
      .finally(() => setLoadingPlayer(false));

    fetch(`/api/race-results?playerId=${encodeURIComponent(playerId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRaceResults)
      .catch(() => {});

    fetch(`/api/personal-karte?playerId=${encodeURIComponent(playerId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setPersonalRecords)
      .catch(() => {});
  }, [playerId]);

  const fetchRecords = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const [karteRes, bloodRes, inbodyRes] = await Promise.all([
        fetch(`/api/karte?playerId=${encodeURIComponent(playerId)}`),
        fetch(`/api/blood-test?playerId=${encodeURIComponent(playerId)}`),
        fetch(`/api/inbody?playerId=${encodeURIComponent(playerId)}`),
      ]);
      if (!karteRes.ok || !bloodRes.ok || !inbodyRes.ok) throw new Error("取得失敗");
      setRecords(await karteRes.json());
      setBloodRecords(await bloodRes.json());
      setInbodyRecords(await inbodyRes.json());
    } catch {
      setHistoryError("記録の読み込みに失敗しました");
    } finally {
      setLoadingHistory(false);
    }
  }, [playerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecords();
  }, [fetchRecords]);

  const jumpToCard = useCallback((anchorId: string) => {
    requestAnimationFrame(() => {
      const candidates = document.querySelectorAll<HTMLElement>(`[data-anchor-id="${anchorId}"]`);
      const visible = Array.from(candidates).find((el) => el.offsetParent !== null);
      (visible ?? candidates[0])?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const jumpToMedical = useCallback(
    (dateStr: string) => {
      const matches = records.filter((r) => r.createdAt.startsWith(dateStr));
      if (matches.length === 0) return;
      const oldest = matches.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
      jumpToCard(`medical-${oldest.id}`);
    },
    [records, jumpToCard]
  );

  const jumpToRace = useCallback(
    (dateStr: string) => {
      const target = raceResults.find((r) => r.date === dateStr);
      if (!target) return;
      jumpToCard(`race-${target.id}`);
    },
    [raceResults, jumpToCard]
  );

  const jumpToPersonal = useCallback(
    (dateStr: string) => {
      const target = personalRecords.find((r) => r.createdAt.startsWith(dateStr));
      if (!target) return;
      jumpToCard(`personal-${target.id}`);
    },
    [personalRecords, jumpToCard]
  );

  const jumpToBlood = useCallback(
    (dateStr: string) => {
      const target = bloodRecords.find((r) => r.testDate === dateStr);
      if (!target) return;
      jumpToCard(`blood-${target.id}`);
    },
    [bloodRecords, jumpToCard]
  );

  const jumpToInBody = useCallback(
    (dateStr: string) => {
      const target = inbodyRecords.find((r) => r.measuredDate === dateStr);
      if (!target) return;
      jumpToCard(`inbody-${target.id}`);
    },
    [inbodyRecords, jumpToCard]
  );

  const handleSubmit = async (data: KarteFormData) => {
    const res = await fetch("/api/karte", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("保存失敗");
    await fetchRecords();
    setActiveTab("history");
  };

  const handleUpdate = async (data: KarteFormData) => {
    if (!editingKarte) return;
    const res = await fetch(`/api/karte/${editingKarte.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("更新失敗");
    await fetchRecords();
    setEditingKarte(null);
  };

  const playerName = player?.name ?? "";

  const historyContent = loadingHistory ? (
    <div className="flex items-center justify-center py-8 gap-2">
      <Spinner />
      <span className="text-sm text-gray-300">読み込み中...</span>
    </div>
  ) : historyError ? (
    <div className="flex flex-col items-center gap-2 py-8">
      <p className="text-sm text-red-400">{historyError}</p>
      <button onClick={fetchRecords} className="text-xs text-green-600 underline">再試行</button>
    </div>
  ) : allItems.length === 0 ? (
    <div className="flex flex-col items-center justify-center h-32 text-gray-300 gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-sm">まだ記録はありません</p>
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      {allItems.map((item) => {
        if (item.type === "medical") {
          return (
            <MedicalKarteCard
              key={item.data.id}
              record={item.data}
              index={karteIndexMap.get(item.data.id) ?? 0}
              onEdit={setEditingKarte}
            />
          );
        }
        if (item.type === "personal") {
          return <PersonalKarteCard key={item.data.id} record={item.data} />;
        }
        if (item.type === "blood") {
          return <BloodTestCard key={item.data.id} record={item.data} playerGender={player?.gender} />;
        }
        if (item.type === "inbody") {
          return <InBodyCard key={item.data.id} record={item.data} />;
        }
        return <RaceResultCard key={item.data.id} result={item.data} />;
      })}
    </div>
  );

  const historyPanel = (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
      {!loadingHistory && !historyError && (
        <MiniCalendar
          karteDates={karteDates}
          personalDates={personalDates}
          raceDates={raceDates}
          bloodDates={bloodDates}
          inbodyDates={inbodyDates}
          onJumpToMedical={jumpToMedical}
          onJumpToRace={jumpToRace}
          onJumpToPersonal={jumpToPersonal}
          onJumpToBlood={jumpToBlood}
          onJumpToInBody={jumpToInBody}
        />
      )}
      {historyContent}
    </div>
  );

  const formTabs = (
    <div className="flex border-b border-gray-100 mb-4 -mt-1">
      <button
        onClick={() => setFormTab("medical")}
        className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 ${
          formTab === "medical" ? "border-green-600 text-green-600" : "border-transparent text-gray-400"
        }`}
      >
        メディカルカルテ
      </button>
      <button
        onClick={() => setFormTab("profile")}
        className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 ${
          formTab === "profile" ? "border-gray-700 text-gray-700" : "border-transparent text-gray-400"
        }`}
      >
        プロフィール
      </button>
    </div>
  );

  const formContent = !loadingPlayer && player && (
    <>
      {formTabs}
      {formTab === "medical" && (
        <KarteForm playerId={playerId} playerName={playerName} onSubmit={handleSubmit} />
      )}
      {formTab === "profile" && (
        <>
          <PlayerProfileForm playerId={playerId} playerName={playerName} />
          <BloodTestTrendTable records={bloodRecords} playerGender={player?.gender} />
        </>
      )}
    </>
  );

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="bg-green-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">S</div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 min-w-0">
          <Link href="/" className="hover:text-green-600 transition-colors shrink-0">選手一覧</Link>
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {loadingPlayer ? (
            <span className="text-gray-400">読み込み中...</span>
          ) : (
            <span className="text-gray-700 font-semibold truncate">
              {playerName}
              {player?.grade && <span className="ml-1 text-gray-400 font-normal">{player.grade}</span>}
            </span>
          )}
        </div>
      </header>

      <div className="md:hidden flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("form")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "form"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-400"
          }`}
        >
          新規記入
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === "history"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-400"
          }`}
        >
          記録
          {allItems.length > 0 && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              activeTab === "history" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
            }`}>
              {allItems.length}
            </span>
          )}
        </button>
      </div>

      <div className="md:hidden flex-1 overflow-hidden flex flex-col min-h-0">
        {activeTab === "form" ? (
          <div className="flex-1 overflow-y-auto p-4">
            {formContent}
          </div>
        ) : (
          historyPanel
        )}
      </div>

      <main className="hidden md:flex flex-1 overflow-hidden min-h-0">
        <section className="w-1/2 flex flex-col border-r border-gray-200 bg-white">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-700">新規記入</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date().toLocaleDateString("ja-JP", {
                year: "numeric", month: "long", day: "numeric", weekday: "long",
              })}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {formContent}
          </div>
        </section>

        <section className="w-1/2 flex flex-col bg-gray-50">
          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">記録</h2>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {raceResults.length > 0 && (
                  <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                    大会 {raceResults.length}件
                  </span>
                )}
                {personalRecords.length > 0 && (
                  <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                    パーソナル {personalRecords.length}件
                  </span>
                )}
                {bloodRecords.length > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                    血液検査 {bloodRecords.length}件
                  </span>
                )}
                {inbodyRecords.length > 0 && (
                  <span className="bg-purple-100 text-purple-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                    InBody {inbodyRecords.length}件
                  </span>
                )}
                {records.length > 0 && (
                  <span className="bg-green-100 text-green-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                    メディカル {records.length}件
                  </span>
                )}
              </div>
            </div>
          </div>
          {historyPanel}
        </section>
      </main>

      {editingKarte && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4"
          onClick={() => setEditingKarte(null)}
        >
          <div
            className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <p className="text-sm font-bold text-gray-800">メディカルカルテを編集</p>
              <button
                onClick={() => setEditingKarte(null)}
                className="text-gray-400 hover:text-gray-600 p-1 -m-1"
                aria-label="閉じる"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <KarteForm
                key={editingKarte.id}
                playerId={playerId}
                playerName={playerName}
                record={editingKarte}
                onSubmit={handleUpdate}
                onCancel={() => setEditingKarte(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
