"use client";

import { useState } from "react";
import { KarteFormData, KarteRecord, NeedleTreatment, TreatmentScope } from "@/types/karte";

interface KarteFormProps {
  playerId: string;
  playerName: string;
  record?: KarteRecord;
  onSubmit: (data: KarteFormData) => Promise<void>;
  onCancel?: () => void;
}

const TRAINER_OPTIONS = ["吉見", "桑原", "吉田"];
const NEEDLE_OPTIONS: NeedleTreatment[] = ["あり", "なし"];
const SCOPE_OPTIONS: TreatmentScope[] = ["全身治療", "部分治療"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return {
    trainerName: "",
    chiefComplaint: "",
    needleTreatment: "" as NeedleTreatment,
    needleLocation: "",
    treatmentScope: "" as TreatmentScope,
    overallAssessment: "",
    treatmentDate: today(),
  };
}

export default function KarteForm({ playerId, playerName, record, onSubmit, onCancel }: KarteFormProps) {
  const isEditing = !!record;
  const [form, setForm] = useState(() =>
    record
      ? {
          trainerName: record.trainerName,
          chiefComplaint: record.chiefComplaint,
          needleTreatment: record.needleTreatment,
          needleLocation: record.needleLocation,
          treatmentScope: record.treatmentScope,
          overallAssessment: record.overallAssessment,
          treatmentDate: record.createdAt.slice(0, 10),
        }
      : emptyForm()
  );
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.trainerName.trim() || !form.treatmentDate) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        playerId,
        clientName: playerName,
        ...form,
      });
      if (isEditing) return;
      setForm(emptyForm());
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      setError(
        isEditing ? "更新に失敗しました。もう一度お試しください。" : "保存に失敗しました。もう一度お試しください。"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 h-full">
      {/* 施術日 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          施術日 <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          name="treatmentDate"
          value={form.treatmentDate}
          onChange={handleChange}
          required
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent bg-white text-gray-800"
        />
      </div>

      {/* 担当トレーナー名 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          担当トレーナー名 <span className="text-red-400">*</span>
        </label>
        <select
          name="trainerName"
          value={form.trainerName}
          onChange={handleChange}
          required
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent bg-white text-gray-800"
        >
          <option value="">トレーナーを選択...</option>
          {TRAINER_OPTIONS.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* 主訴 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">主訴</label>
        <textarea
          name="chiefComplaint"
          value={form.chiefComplaint}
          onChange={handleChange}
          rows={3}
          placeholder="気になる症状や痛みの箇所、経緯など..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent bg-white resize-none"
        />
      </div>

      {/* 針治療の有無 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">針治療の有無</label>
        <select
          name="needleTreatment"
          value={form.needleTreatment}
          onChange={handleChange}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent bg-white text-gray-800"
        >
          <option value="">選択してください...</option>
          {NEEDLE_OPTIONS.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* 針治療の箇所（あり選択時のみ表示） */}
      {form.needleTreatment === "あり" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">針治療の箇所</label>
          <textarea
            name="needleLocation"
            value={form.needleLocation}
            onChange={handleChange}
            rows={2}
            placeholder="施術箇所を記入..."
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent bg-white resize-none"
          />
        </div>
      )}

      {/* 治療範囲 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">治療範囲</label>
        <select
          name="treatmentScope"
          value={form.treatmentScope}
          onChange={handleChange}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent bg-white text-gray-800"
        >
          <option value="">選択してください...</option>
          {SCOPE_OPTIONS.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* 総評 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">総評</label>
        <textarea
          name="overallAssessment"
          value={form.overallAssessment}
          onChange={handleChange}
          rows={3}
          placeholder="今回の施術の評価、次回へのメモなど..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent bg-white resize-none"
        />
      </div>

      <div className={isEditing ? "mt-auto flex gap-2" : "mt-auto"}>
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            キャンセル
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className={`${isEditing ? "flex-1" : "w-full"} bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-green-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm shadow-sm flex items-center justify-center gap-2`}
        >
          {saving && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {saving ? (isEditing ? "更新中..." : "保存中...") : isEditing ? "カルテを更新する" : "カルテを保存する"}
        </button>
      </div>

      {submitted && (
        <p className="text-center text-sm text-green-600 font-medium -mt-2">✓ Notionに保存しました</p>
      )}
      {error && (
        <p className="text-center text-sm text-red-500 font-medium -mt-2">{error}</p>
      )}
    </form>
  );
}
