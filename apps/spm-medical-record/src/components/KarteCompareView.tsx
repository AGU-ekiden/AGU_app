"use client";

import { useEffect, useRef, useState } from "react";
import { KarteRecord } from "@/types/karte";

interface KarteCompareViewProps {
  records: KarteRecord[];
  onCopyTags?: (tags: string[]) => void;
  onCopyTrainingContent?: (content: string) => void;
  onEdit?: (record: KarteRecord) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

interface FieldRow {
  key: "chiefComplaint" | "physicalCheck" | "procedureContent" | "trainingContent" | "memo";
  label: string;
  labelClass: string;
}

const FIELD_ROWS: FieldRow[] = [
  { key: "chiefComplaint", label: "主訴", labelClass: "text-orange-500" },
  { key: "physicalCheck", label: "状態（フィジカルチェック）", labelClass: "text-purple-500" },
  { key: "procedureContent", label: "実施内容", labelClass: "text-teal-500" },
  { key: "trainingContent", label: "トレーニング内容", labelClass: "text-blue-500" },
  { key: "memo", label: "memo", labelClass: "text-green-500" },
];

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors shrink-0 ${
        copied
          ? "bg-green-100 text-green-600"
          : "bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-500"
      }`}
    >
      {copied ? "✓" : "コピー"}
    </button>
  );
}

export default function KarteCompareView({ records, onCopyTags, onCopyTrainingContent, onEdit }: KarteCompareViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const flashCopied = (key: string) => {
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
  };

  // 主訴などの縦スクロールセル上にカーソルがあっても、横方向優位のホイール操作は
  // 常にこのコンテナの横スクロールとして扱う（React の onWheel は passive のため
  // preventDefault できず、ネイティブリスナーで登録する）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        el.scrollLeft += e.deltaX;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-300 gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">カルテはまだありません</p>
      </div>
    );
  }

  // 全カルテで空の行は表示しない
  const visibleRows = FIELD_ROWS.filter((row) => records.some((r) => r[row.key]));
  const hasMedia = records.some((r) => r.mediaUrls && r.mediaUrls.length > 0);

  const gridTemplateColumns = `auto repeat(${records.length}, minmax(240px, 300px))`;
  const labelCellClass = "w-9 shrink-0";
  const labelTextClass = "[writing-mode:vertical-rl] mx-auto";

  return (
    <div ref={scrollRef} className="h-full overflow-auto overscroll-contain rounded-xl border border-gray-200 bg-white">
      <div className="grid w-max min-w-full" style={{ gridTemplateColumns }}>
        {/* ヘッダー行（日付・担当・場所・タグ） */}
        <div className={`sticky top-0 left-0 z-30 bg-gray-50 border-b border-r border-gray-200 px-1 py-2 ${labelCellClass}`}>
          <p className={`text-[10px] font-semibold text-gray-400 ${labelTextClass}`}>セッション</p>
        </div>
        {records.map((record, i) => (
          <div
            key={record.id}
            data-anchor-id={`karte-${record.id}`}
            className={`sticky top-0 z-20 border-b border-gray-200 px-3 py-2 ${
              i === 0 ? "bg-blue-50/95" : "bg-gray-50/95"
            } ${i < records.length - 1 ? "border-r border-r-gray-100" : ""} backdrop-blur-sm`}
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-xs font-bold ${i === 0 ? "text-blue-700" : "text-gray-700"}`}>
                  {formatDate(record.createdAt)}
                </span>
                {i === 0 && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">最新</span>
                )}
              </div>
              {onEdit && (
                <button
                  onClick={() => onEdit(record)}
                  className="text-gray-400 hover:text-blue-600 p-0.5 -m-0.5 transition-colors shrink-0"
                  aria-label="編集"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {record.trainerName && (
                <span className="text-[10px] text-gray-500 font-medium">{record.trainerName}</span>
              )}
              {record.location && (
                <span className="text-[10px] bg-white text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded-full">
                  {record.location}
                </span>
              )}
            </div>
            {record.tags && record.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap mt-1">
                {record.tags.map((tag) => (
                  <span key={tag} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium border border-blue-100">
                    {tag}
                  </span>
                ))}
                {onCopyTags && (
                  <CopyButton
                    copied={copiedKey === `tags-${record.id}`}
                    onClick={() => {
                      onCopyTags(record.tags);
                      flashCopied(`tags-${record.id}`);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        ))}

        {/* 項目行 */}
        {visibleRows.map((row) => (
          <div key={row.key} className="contents">
            <div className={`sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-1 py-2 ${labelCellClass}`}>
              <p className={`text-[10px] font-semibold leading-tight ${row.labelClass} ${labelTextClass}`}>{row.label}</p>
            </div>
            {records.map((record, i) => {
              const value = record[row.key];
              return (
                <div
                  key={record.id}
                  className={`border-b border-gray-100 px-3 py-2 align-top ${
                    i === 0 ? "bg-blue-50/30" : ""
                  } ${i < records.length - 1 ? "border-r border-r-gray-100" : ""}`}
                >
                  {value ? (
                    <>
                      {row.key === "trainingContent" && onCopyTrainingContent && (
                        <div className="flex justify-end mb-1">
                          <CopyButton
                            copied={copiedKey === `training-${record.id}`}
                            onClick={() => {
                              onCopyTrainingContent(value);
                              flashCopied(`training-${record.id}`);
                            }}
                          />
                        </div>
                      )}
                      <p
                        className={`text-xs text-gray-600 whitespace-pre-wrap leading-relaxed overflow-y-auto overscroll-contain ${
                          row.key === "trainingContent" ? "max-h-[40rem]" : "max-h-96"
                        }`}
                      >
                        {value}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-200">—</p>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* メディア行 */}
        {hasMedia && (
          <div className="contents">
            <div className={`sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-1 py-2 ${labelCellClass}`}>
              <p className={`text-[10px] font-semibold text-gray-500 leading-tight ${labelTextClass}`}>メディア</p>
            </div>
            {records.map((record, i) => (
              <div
                key={record.id}
                className={`border-b border-gray-100 px-3 py-2 ${
                  i === 0 ? "bg-blue-50/30" : ""
                } ${i < records.length - 1 ? "border-r border-r-gray-100" : ""}`}
              >
                {record.mediaUrls && record.mediaUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {record.mediaUrls.map((url, j) => {
                      const isVideo = /\.(mp4|mov|webm|avi)(\?|$)/i.test(url);
                      return isVideo ? (
                        <video key={j} src={url} className="w-20 h-16 object-cover rounded-lg border border-gray-100" controls preload="metadata" />
                      ) : (
                        <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="w-20 h-16 object-cover rounded-lg border border-gray-100 hover:opacity-90 transition-opacity" />
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-200">—</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
