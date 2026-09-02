"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiPath } from "@/lib/api-path";
import { ActivityForJournal, Player, StravaActivitySummary } from "@/lib/types";
import PlayerSelect from "@/components/PlayerSelect";
import ActivityPreviewCard from "@/components/ActivityPreviewCard";
import JournalForm from "@/components/JournalForm";

const LAST_PLAYER_KEY = "training-log:lastPlayerId";

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function StravaConnectNotice() {
  const params = useSearchParams();
  const status = params.get("strava");
  if (status === "connected") {
    return (
      <p className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
        Strava連携が完了しました。
      </p>
    );
  }
  if (status === "error" || status === "denied") {
    return (
      <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
        Strava連携に失敗しました。もう一度お試しください。
      </p>
    );
  }
  return null;
}

export default function JournalPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  const [connected, setConnected] = useState<boolean | null>(null);
  const [activities, setActivities] = useState<StravaActivitySummary[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [skipActivity, setSkipActivity] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(apiPath("/api/players"))
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Player[]) => {
        setPlayers(data);
        const saved = localStorage.getItem(LAST_PLAYER_KEY);
        if (saved && data.some((p) => p.id === saved)) {
          setSelectedPlayerId(saved);
        }
      })
      .catch(() => {})
      .finally(() => setPlayersLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPlayerId) return;
    localStorage.setItem(LAST_PLAYER_KEY, selectedPlayerId);

    let cancelled = false;
    async function loadActivities() {
      setSelectedActivityId(null);
      setSkipActivity(false);
      setActivitiesError(null);
      setActivitiesLoading(true);
      try {
        const r = await fetch(apiPath(`/api/strava/activities?playerId=${selectedPlayerId}`));
        if (!r.ok) throw new Error();
        const data: { connected: boolean; activities: StravaActivitySummary[] } = await r.json();
        if (cancelled) return;
        setConnected(data.connected);
        setActivities(data.activities);
        if (data.activities.length > 0) setSelectedActivityId(data.activities[0].id);
      } catch {
        if (!cancelled) setActivitiesError("Stravaのデータ取得に失敗しました");
      } finally {
        if (!cancelled) setActivitiesLoading(false);
      }
    }
    loadActivities();

    return () => {
      cancelled = true;
    };
  }, [selectedPlayerId]);

  async function handleConnectStrava() {
    const response = await fetch(apiPath(`/api/strava/auth-url?playerId=${selectedPlayerId}`));
    if (!response.ok) return;
    const { url } = await response.json();
    window.location.href = url;
  }

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ?? null;
  const selectedActivity = activities.find((a) => a.id === selectedActivityId) ?? null;
  const activityForJournal: ActivityForJournal | null = selectedActivity
    ? {
        stravaActivityId: selectedActivity.id,
        distanceKm: selectedActivity.distanceKm,
        durationSec: selectedActivity.movingTimeSec,
        avgPaceSecPerKm: selectedActivity.avgPaceSecPerKm,
        avgHeartRate: selectedActivity.avgHeartRate,
        stravaUrl: selectedActivity.stravaUrl,
      }
    : null;

  const readyForForm = Boolean(selectedPlayer) && (Boolean(activityForJournal) || skipActivity);

  return (
    <main className="flex-1 mx-auto w-full max-w-md px-4 pt-14 pb-10">
      <h1 className="text-xl font-bold text-gray-900 mb-1">練習日誌</h1>
      <p className="text-sm text-gray-500 mb-4">Garmin/COROSの走行データ(Strava経由)と今日の自覚症状を記録します。</p>

      <Suspense fallback={null}>
        <div className="mb-4">
          <StravaConnectNotice />
        </div>
      </Suspense>

      <div className="space-y-4">
        {playersLoading ? (
          <p className="text-sm text-gray-500">選手一覧を読み込み中…</p>
        ) : (
          <PlayerSelect players={players} selectedId={selectedPlayerId} onChange={setSelectedPlayerId} />
        )}

        {selectedPlayerId && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">ウォッチデータ(Strava)</h2>
            {activitiesLoading && <p className="text-sm text-gray-500">読み込み中…</p>}
            {activitiesError && <p className="text-sm text-red-600">{activitiesError}</p>}

            {!activitiesLoading && connected === false && (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center">
                <p className="text-sm text-gray-600 mb-3">
                  まだStravaと連携していません。連携するとGarmin/COROSの走行データを自動で取り込めます。
                </p>
                <button
                  type="button"
                  onClick={handleConnectStrava}
                  className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white"
                >
                  Stravaと連携する
                </button>
              </div>
            )}

            {!activitiesLoading && connected && activities.length === 0 && (
              <p className="text-sm text-gray-500">直近のランニングアクティビティが見つかりませんでした。</p>
            )}

            {!activitiesLoading && connected && activities.length > 0 && (
              <div className="space-y-2">
                {activities.map((activity) => (
                  <ActivityPreviewCard
                    key={activity.id}
                    activity={activity}
                    selected={!skipActivity && selectedActivityId === activity.id}
                    onSelect={() => {
                      setSkipActivity(false);
                      setSelectedActivityId(activity.id);
                    }}
                  />
                ))}
              </div>
            )}

            {!activitiesLoading && connected !== null && (
              <button
                type="button"
                onClick={() => {
                  setSkipActivity(true);
                  setSelectedActivityId(null);
                }}
                className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm ${
                  skipActivity ? "border-green-600 bg-green-50 text-green-800" : "border-gray-300 text-gray-500"
                }`}
              >
                走行データなしで記録する
              </button>
            )}
          </section>
        )}

        {readyForForm && selectedPlayer && (
          <section className="pt-2 border-t border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 my-3">日誌入力</h2>
            {submitted ? (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                <p className="text-green-800 font-semibold mb-3">送信しました。お疲れさまでした!</p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="text-sm text-green-700 underline"
                >
                  続けて別の記録を入力する
                </button>
              </div>
            ) : (
              <JournalForm
                player={selectedPlayer}
                date={todayIso()}
                activity={activityForJournal}
                onSubmitted={() => setSubmitted(true)}
              />
            )}
          </section>
        )}
      </div>
    </main>
  );
}
