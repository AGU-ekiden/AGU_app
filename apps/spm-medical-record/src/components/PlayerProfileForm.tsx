"use client";

import { useEffect, useState } from "react";
import { PlayerProfile } from "@/types/karte";

interface PlayerProfileFormProps {
  playerId: string;
  playerName: string;
}

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export default function PlayerProfileForm({ playerId, playerName }: PlayerProfileFormProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [existingConditions, setExistingConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = () => {
    setLoading(true);
    setLoadError(false);
    fetch(`/api/profile?playerId=${encodeURIComponent(playerId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("取得失敗");
        return r.json();
      })
      .then((profile: PlayerProfile | null) => {
        if (profile) {
          setExistingConditions(profile.existingConditions);
          setMedications(profile.medications);
          setUpdatedAt(profile.updatedAt);
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          clientName: playerName,
          existingConditions,
          medications,
        }),
      });
      if (!res.ok) throw new Error("保存失敗");
      const profile: PlayerProfile = await res.json();
      setUpdatedAt(profile.updatedAt);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      setError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Spinner />
        <span className="text-sm text-gray-300">読み込み中...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-2 py-12">
        <p className="text-sm text-red-400">プロフィールの読み込みに失敗しました</p>
        <button onClick={loadProfile} className="text-xs text-blue-500 underline">再試行</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 h-full">
      {updatedAt && (
        <p className="text-xs text-gray-400">
          最終更新: {new Date(updatedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">既往歴</label>
        <textarea
          value={existingConditions}
          onChange={(e) => setExistingConditions(e.target.value)}
          rows={5}
          placeholder="過去の怪我、手術歴、慢性疾患など..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white resize-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">服用している薬</label>
        <textarea
          value={medications}
          onChange={(e) => setMedications(e.target.value)}
          rows={5}
          placeholder="現在服用中の薬、サプリメントなど..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm shadow-sm flex items-center justify-center gap-2"
      >
        {saving && (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
        {saving ? "保存中..." : "プロフィールを保存する"}
      </button>

      {submitted && (
        <p className="text-center text-sm text-green-600 font-medium -mt-2">✓ Notionに保存しました</p>
      )}
      {error && (
        <p className="text-center text-sm text-red-500 font-medium -mt-2">{error}</p>
      )}
    </form>
  );
}
