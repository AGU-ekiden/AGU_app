"use client";

import { StravaActivitySummary } from "@/lib/types";

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function formatPace(secPerKm: number | null): string {
  if (secPerKm == null) return "-";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, "0")}"`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
}

interface Props {
  activity: StravaActivitySummary;
  selected: boolean;
  onSelect: () => void;
}

export default function ActivityPreviewCard({ activity, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-3 transition ${
        selected ? "border-green-600 bg-green-50 ring-1 ring-green-600" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{formatDate(activity.startDateLocal)}</span>
        <span className="text-xs text-gray-400 truncate max-w-[50%]">{activity.name}</span>
      </div>
      <div className="mt-1 grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-gray-900">{activity.distanceKm.toFixed(2)}</div>
          <div className="text-[10px] text-gray-500">km</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{formatDuration(activity.movingTimeSec)}</div>
          <div className="text-[10px] text-gray-500">タイム</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{formatPace(activity.avgPaceSecPerKm)}</div>
          <div className="text-[10px] text-gray-500">/km</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{activity.avgHeartRate ?? "-"}</div>
          <div className="text-[10px] text-gray-500">bpm</div>
        </div>
      </div>
      {activity.laps.length > 0 && (
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {activity.laps.map((lap) => (
            <span
              key={lap.lapIndex}
              className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
            >
              {lap.lapIndex}周 {formatDuration(lap.movingTimeSec)}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
