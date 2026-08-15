"use client";

import { useState, useEffect, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { KarteFormData, KarteRecord } from "@/types/karte";

interface KarteFormProps {
  playerId: string;
  playerName: string;
  initialTags?: string[];
  initialTrainingContent?: string;
  record?: KarteRecord;
  onSubmit: (data: KarteFormData) => Promise<void>;
  onCancel?: () => void;
}

type MediaItem = {
  id: string;
  preview: string;
  isVideo: boolean;
  url?: string;
  uploading: boolean;
  error?: boolean;
};

const VIDEO_EXTS = ["mp4", "mov", "webm", "avi"];
const COMPRESSIBLE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const COMPRESS_THRESHOLD = 2 * 1024 * 1024; // 2MB以上を圧縮

function isVideoFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return file.type.startsWith("video/") || VIDEO_EXTS.includes(ext);
}

async function compressImage(file: File): Promise<File> {
  const MAX_DIM = 1920;
  const QUALITY = 0.82;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
        else { width = Math.round((width * MAX_DIM) / height); height = MAX_DIM; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("compression failed")); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load failed")); };
    img.src = url;
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return {
    treatmentDate: today(),
    trainerName: "",
    location: "",
    chiefComplaint: "",
    physicalCheck: "",
    procedureContent: "",
    trainingContent: "",
    memo: "",
  };
}

function autoResizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export default function KarteForm({ playerId, playerName, initialTags, initialTrainingContent, record, onSubmit, onCancel }: KarteFormProps) {
  const isEditing = !!record;
  const [form, setForm] = useState(() =>
    record
      ? {
          // 表示と同じく施術日を優先（未設定の記録は記録日時にフォールバックしている）
          treatmentDate: record.createdAt.slice(0, 10),
          trainerName: record.trainerName,
          location: record.location,
          chiefComplaint: record.chiefComplaint,
          physicalCheck: record.physicalCheck,
          procedureContent: record.procedureContent,
          trainingContent: record.trainingContent,
          memo: record.memo,
        }
      : emptyForm()
  );
  const chiefComplaintRef = useRef<HTMLTextAreaElement>(null);
  const trainingContentRef = useRef<HTMLTextAreaElement>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>(() => record?.tags ?? []);
  const [trainerOptions, setTrainerOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() =>
    (record?.mediaUrls ?? []).map((url) => ({
      id: url,
      preview: url,
      isVideo: VIDEO_EXTS.some((ext) => url.split("?")[0].toLowerCase().endsWith(`.${ext}`)),
      url,
      uploading: false,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/trainers").then((r) => r.json()).then(setTrainerOptions).catch(() => {});
    fetch("/api/locations").then((r) => r.json()).then(setLocationOptions).catch(() => {});
    fetch("/api/tags").then((r) => r.json()).then(setTagOptions).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialTags && initialTags.length > 0) {
      setSelectedTags(initialTags);
    }
  }, [initialTags]);

  useEffect(() => {
    if (initialTrainingContent !== undefined && initialTrainingContent !== "") {
      setForm((prev) => ({ ...prev, trainingContent: initialTrainingContent }));
    }
  }, [initialTrainingContent]);

  useEffect(() => {
    autoResizeTextarea(chiefComplaintRef.current);
  }, [form.chiefComplaint]);

  useEffect(() => {
    autoResizeTextarea(trainingContentRef.current);
  }, [form.trainingContent]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addNewTag = () => {
    const tag = newTagInput.trim();
    if (!tag) return;
    if (!selectedTags.includes(tag)) setSelectedTags((prev) => [...prev, tag]);
    if (!tagOptions.includes(tag)) setTagOptions((prev) => [...prev, tag]);
    setNewTagInput("");
  };

  const handleNewTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addNewTag(); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const newItems: MediaItem[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      preview: URL.createObjectURL(file),
      isVideo: isVideoFile(file),
      uploading: true,
    }));

    setMediaItems((prev) => [...prev, ...newItems]);

    await Promise.all(
      newItems.map(async (item, i) => {
        try {
          const original = files[i];
          const fileToUpload =
            !item.isVideo &&
            COMPRESSIBLE_TYPES.includes(original.type) &&
            original.size > COMPRESS_THRESHOLD
              ? await compressImage(original)
              : original;
          const blob = await upload(fileToUpload.name, fileToUpload, {
            access: "public",
            handleUploadUrl: "/api/upload",
          });
          setMediaItems((prev) =>
            prev.map((m) => (m.id === item.id ? { ...m, url: blob.url, uploading: false } : m))
          );
        } catch {
          setMediaItems((prev) =>
            prev.map((m) => (m.id === item.id ? { ...m, uploading: false, error: true } : m))
          );
        }
      })
    );
  };

  const removeMedia = (id: string) => {
    setMediaItems((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((m) => m.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.trainerName.trim() || !form.treatmentDate) return;
    if (mediaItems.some((m) => m.uploading)) {
      setError("アップロード中のファイルがあります。完了をお待ちください。");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        playerId,
        clientName: playerName,
        ...form,
        tags: selectedTags,
        mediaUrls: mediaItems.filter((m) => m.url && !m.error).map((m) => m.url!),
      });
      if (isEditing) return;
      setForm(emptyForm());
      setSelectedTags([]);
      setMediaItems([]);
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
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white text-gray-800"
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
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white text-gray-800"
        >
          <option value="">トレーナーを選択...</option>
          {trainerOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* 場所 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">場所</label>
        <select
          name="location"
          value={form.location}
          onChange={handleChange}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white text-gray-800"
        >
          <option value="">場所を選択...</option>
          {locationOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* タグ */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">タグ</label>
        {tagOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tagOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-blue-600 text-white border-blue-600 font-medium"
                    : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-500"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={handleNewTagKeyDown}
            placeholder="新しいタグを入力..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white"
          />
          <button
            type="button"
            onClick={addNewTag}
            disabled={!newTagInput.trim()}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-500 font-medium transition-colors disabled:opacity-40"
          >
            追加
          </button>
        </div>
      </div>

      {/* 主訴 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">主訴</label>
        <textarea
          ref={chiefComplaintRef}
          name="chiefComplaint"
          value={form.chiefComplaint}
          onChange={handleChange}
          rows={15}
          placeholder="今日の体調や気になる箇所、目標など..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white resize-none overflow-hidden"
        />
      </div>

      {/* 状態（フィジカルチェック） */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          状態（フィジカルチェック）
        </label>
        <textarea
          name="physicalCheck"
          value={form.physicalCheck}
          onChange={handleChange}
          rows={3}
          placeholder="可動域やアライメントなど、フィジカルチェックの所見..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white resize-none"
        />
      </div>

      {/* 実施内容 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          実施内容
        </label>
        <textarea
          name="procedureContent"
          value={form.procedureContent}
          onChange={handleChange}
          rows={3}
          placeholder="施術・ケアとして実施した内容..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white resize-none"
        />
      </div>

      {/* トレーニング内容 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          トレーニング内容
        </label>
        <textarea
          ref={trainingContentRef}
          name="trainingContent"
          value={form.trainingContent}
          onChange={handleChange}
          rows={15}
          placeholder="実施したメニュー、セット数、重量、フォームのポイントなど..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white resize-none overflow-hidden"
        />
      </div>

      {/* memo */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">memo</label>
        <textarea
          name="memo"
          value={form.memo}
          onChange={handleChange}
          rows={3}
          placeholder="今日のセッション全体の評価、次回へのメモなど..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white resize-none"
        />
      </div>

      {/* メディア */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          写真・動画
        </label>

        {/* プレビューグリッド */}
        {mediaItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {mediaItems.map((item) => (
              <div key={item.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                {item.isVideo ? (
                  <video
                    src={item.preview}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}

                {/* オーバーレイ */}
                {item.uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  </div>
                )}
                {item.error && (
                  <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">失敗</span>
                  </div>
                )}

                {/* 削除ボタン */}
                <button
                  type="button"
                  onClick={() => removeMedia(item.id)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* 動画アイコン */}
                {item.isVideo && !item.uploading && (
                  <div className="absolute bottom-0.5 left-0.5 bg-black/50 rounded px-1">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}

            {/* 追加ボタン（プレビューと並べて） */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-300 flex items-center justify-center text-gray-300 hover:text-blue-400 transition-colors shrink-0"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}

        {/* 初回アップロードボタン */}
        {mediaItems.length === 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 hover:border-blue-300 rounded-lg py-4 flex flex-col items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-colors"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">写真・動画を追加</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
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
          className={`${isEditing ? "flex-1" : "w-full"} bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm shadow-sm flex items-center justify-center gap-2`}
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
