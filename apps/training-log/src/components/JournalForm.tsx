"use client";

import { useState } from "react";
import { apiPath } from "@/lib/api-path";
import { ActivityForJournal, MENU_TYPES, MenuType, Player } from "@/lib/types";
import RpeSlider from "@/components/RpeSlider";
import TagPicker from "@/components/TagPicker";

interface Props {
  player: Player;
  date: string;
  activity: ActivityForJournal | null;
  onSubmitted: () => void;
}

export default function JournalForm({ player, date, activity, onSubmitted }: Props) {
  const [menuType, setMenuType] = useState<MenuType>(MENU_TYPES[0]);
  const [rpe, setRpe] = useState(5);
  const [bodyParts, setBodyParts] = useState<string[]>(["なし"]);
  const [sleepHours, setSleepHours] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(apiPath("/api/journal"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          playerName: player.name,
          date,
          menuType,
          rpe,
          bodyParts,
          sleepHours: sleepHours === "" ? null : Number(sleepHours),
          weightKg: weightKg === "" ? null : Number(weightKg),
          notes,
          activity,
        }),
      });
      if (!response.ok) throw new Error();
      onSubmitted();
      setNotes("");
      setBodyParts(["なし"]);
      setRpe(5);
    } catch {
      setError("送信に失敗しました。通信環境を確認してもう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <span className="block text-sm font-semibold text-gray-700 mb-1">メニュー種別</span>
        <div className="grid grid-cols-2 gap-2">
          {MENU_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMenuType(type)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${
                menuType === type
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <RpeSlider value={rpe} onChange={setRpe} />

      <TagPicker selected={bodyParts} onChange={setBodyParts} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="sleep" className="block text-sm font-semibold text-gray-700 mb-1">
            睡眠時間(h)
          </label>
          <input
            id="sleep"
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            max={24}
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
            placeholder="7.5"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none"
          />
        </div>
        <div>
          <label htmlFor="weight" className="block text-sm font-semibold text-gray-700 mb-1">
            体重(kg)
          </label>
          <input
            id="weight"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="55.0"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-1">
          本日の振り返り・所感
        </label>
        <textarea
          id="notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="体の調子、練習の手応えなど"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-green-700 py-3.5 text-base font-bold text-white shadow-sm disabled:opacity-50"
      >
        {submitting ? "送信中…" : "送信する"}
      </button>
    </form>
  );
}
