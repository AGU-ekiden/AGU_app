"use client";

import { useEffect, useState, useCallback } from "react";
import { apiPath } from "@/lib/api-path";
import { PAIN_LOCATION_OPTIONS, STAGE_OPTIONS, InjuryReportRecord, PlayerInfo } from "@/types/injury";

const PORTAL_AUTH_KEY = "agu_portal_auth";
const INJURY_START_KEY_PREFIX = "injury_report_start_date_";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Page() {
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [loginError, setLoginError] = useState("");

  const [reportDate, setReportDate] = useState(todayStr());
  const [injuryStartDate, setInjuryStartDate] = useState("");
  const [painLocations, setPainLocations] = useState<string[]>([]);
  const [stage, setStage] = useState("");
  const [weeklyDistance, setWeeklyDistance] = useState("");
  const [pointRejoinDate, setPointRejoinDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [history, setHistory] = useState<InjuryReportRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = useCallback(async (playerId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(apiPath(`/api/reports/by-player?playerId=${encodeURIComponent(playerId)}`));
      if (res.ok) setHistory(await res.json());
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    const name = typeof window !== "undefined" ? localStorage.getItem(PORTAL_AUTH_KEY) : null;
    if (!name) {
      setLoadingPlayer(false);
      setLoginError("ポータルからログインしてください");
      return;
    }

    (async () => {
      try {
        const res = await fetch(apiPath(`/api/players?name=${encodeURIComponent(name)}`));
        if (!res.ok) {
          setLoginError("部員DBに該当する選手が見つかりませんでした。管理者に確認してください。");
          return;
        }
        const data: PlayerInfo = await res.json();
        setPlayer(data);
        const savedStart = localStorage.getItem(INJURY_START_KEY_PREFIX + data.id);
        if (savedStart) setInjuryStartDate(savedStart);
        loadHistory(data.id);
      } catch {
        setLoginError("通信エラーが発生しました");
      } finally {
        setLoadingPlayer(false);
      }
    })();
  }, [loadHistory]);

  const togglePainLocation = (name: string) => {
    setPainLocations((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player || !stage) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitted(false);
    try {
      const res = await fetch(apiPath("/api/reports"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          playerName: player.name,
          reportDate,
          injuryStartDate,
          painLocations,
          stage,
          weeklyDistance: weeklyDistance ? Number(weeklyDistance) : undefined,
          pointRejoinDate: pointRejoinDate || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "送信に失敗しました");
      }
      if (injuryStartDate) {
        localStorage.setItem(INJURY_START_KEY_PREFIX + player.id, injuryStartDate);
      }
      setSubmitted(true);
      setStage("");
      setWeeklyDistance("");
      setPointRejoinDate("");
      setPainLocations([]);
      loadHistory(player.id);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPlayer) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-gray-400">読み込み中...</main>
    );
  }

  if (loginError) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-gray-600">{loginError}</p>
        <a href="/" className="rounded-md bg-[#3e8a88] px-4 py-2 text-sm font-bold text-white hover:bg-[#2c6462]">
          ポータルへ戻る
        </a>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-xl mx-auto w-full px-4 pt-16 pb-10 flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-bold text-[#2c6462]">故障者報告</h1>
        <p className="text-sm text-gray-500">{player?.name} さんとして報告します</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4">
        <Field label="報告日">
          <input
            type="date"
            required
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="故障者入りした日" hint="同じ故障が続いている間は、毎週同じ日付のままでOKです">
          <input
            type="date"
            value={injuryStartDate}
            onChange={(e) => setInjuryStartDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="痛みのある個所" hint="複数選択可">
          <div className="flex flex-wrap gap-2">
            {PAIN_LOCATION_OPTIONS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => togglePainLocation(name)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  painLocations.includes(name)
                    ? "border-[#3e8a88] bg-[#eaf5f4] text-[#2c6462] font-bold"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </Field>

        <Field label="今日時点の故障個所のステージ">
          <select
            required
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              選択してください
            </option>
            {STAGE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="今週の走行距離(km)">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            value={weeklyDistance}
            onChange={(e) => setWeeklyDistance(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="ポイント合流した日" hint="復帰できていれば入力してください">
          <input
            type="date"
            value={pointRejoinDate}
            onChange={(e) => setPointRejoinDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        {submitted && <p className="text-sm text-[#2c6462]">報告を送信しました</p>}

        <button
          type="submit"
          disabled={submitting || !stage}
          className="rounded-md bg-[#3e8a88] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2c6462] disabled:opacity-50"
        >
          {submitting ? "送信中..." : "報告する"}
        </button>
      </form>

      <section>
        <h2 className="text-sm font-bold text-gray-500 mb-2">これまでの報告</h2>
        {loadingHistory ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-400">まだ報告はありません</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((r) => (
              <li key={r.id} className="rounded-md border border-gray-200 px-3 py-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-bold">{r.reportDate}</span>
                  <span>{r.stage}</span>
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {r.painLocations.join("・") || "部位未選択"}
                  {r.weeklyDistance != null ? ` / ${r.weeklyDistance}km` : ""}
                  {r.pointRejoinDate ? ` / 合流: ${r.pointRejoinDate}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-bold text-gray-700">{label}</span>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
      {children}
    </label>
  );
}
