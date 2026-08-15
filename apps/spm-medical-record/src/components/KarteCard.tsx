import { useState } from "react";
import { KarteRecord } from "@/types/karte";

interface KarteCardProps {
  record: KarteRecord;
  index: number;
  onCopyTags?: (tags: string[]) => void;
  onCopyTrainingContent?: (content: string) => void;
  onEdit?: (record: KarteRecord) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export default function KarteCard({ record, index, onCopyTags, onCopyTrainingContent, onEdit }: KarteCardProps) {
  const [copiedTags, setCopiedTags] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);

  const handleCopyTags = () => {
    if (!onCopyTags || !record.tags.length) return;
    onCopyTags(record.tags);
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 2000);
  };

  const handleCopyTrainingContent = () => {
    if (!onCopyTrainingContent || !record.trainingContent) return;
    onCopyTrainingContent(record.trainingContent);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
            #{index + 1}
          </span>
          <span className="text-xs text-gray-400">
            {formatDate(record.createdAt)} {formatTime(record.createdAt)}
          </span>
        </div>
        {onEdit && (
          <button
            onClick={() => onEdit(record)}
            className="text-gray-400 hover:text-blue-600 p-1 -m-1 transition-colors"
            aria-label="編集"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">クライアント</p>
          <p className="text-sm font-semibold text-gray-800">{record.clientName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">担当トレーナー</p>
          <p className="text-sm font-semibold text-gray-800">{record.trainerName}</p>
        </div>
        {record.location && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">場所</p>
            <p className="text-sm font-semibold text-gray-800">{record.location}</p>
          </div>
        )}
      </div>

      {record.tags && record.tags.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-xs font-semibold text-gray-500">タグ</p>
            {onCopyTags && (
              <button
                type="button"
                onClick={handleCopyTags}
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                  copiedTags
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-500"
                }`}
              >
                {copiedTags ? "✓ コピー済" : "コピー"}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {record.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium border border-blue-100"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          {record.chiefComplaint ? (
            <>
              <p className="text-xs font-semibold text-orange-500 mb-0.5">主訴</p>
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                {record.chiefComplaint}
              </p>
            </>
          ) : null}
        </div>
        <div>
          {record.trainingContent ? (
            <>
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-xs font-semibold text-blue-500">トレーニング内容</p>
                {onCopyTrainingContent && (
                  <button
                    type="button"
                    onClick={handleCopyTrainingContent}
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                      copiedContent
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-500"
                    }`}
                  >
                    {copiedContent ? "✓ コピー済" : "コピー"}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                {record.trainingContent}
              </p>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          {record.physicalCheck ? (
            <>
              <p className="text-xs font-semibold text-purple-500 mb-0.5">状態（フィジカルチェック）</p>
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                {record.physicalCheck}
              </p>
            </>
          ) : null}
        </div>
        <div>
          {record.procedureContent ? (
            <>
              <p className="text-xs font-semibold text-teal-500 mb-0.5">実施内容</p>
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                {record.procedureContent}
              </p>
            </>
          ) : null}
        </div>
      </div>

      {record.memo && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-green-500 mb-0.5">memo</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
            {record.memo}
          </p>
        </div>
      )}

      {record.mediaUrls && record.mediaUrls.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {record.mediaUrls.map((url, i) => {
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
    </div>
  );
}
