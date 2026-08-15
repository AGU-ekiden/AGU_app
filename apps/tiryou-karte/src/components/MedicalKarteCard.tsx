import { KarteRecord } from "@/types/karte";

interface MedicalKarteCardProps {
  record: KarteRecord;
  index: number;
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

export default function MedicalKarteCard({ record, index, onEdit }: MedicalKarteCardProps) {
  return (
    <div data-anchor-id={`medical-${record.id}`} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
            #{index + 1}
          </span>
          <span className="text-xs text-gray-400">
            {formatDate(record.createdAt)} {formatTime(record.createdAt)}
          </span>
        </div>
        {onEdit && (
          <button
            onClick={() => onEdit(record)}
            className="text-gray-400 hover:text-green-600 p-1 -m-1 transition-colors"
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
      </div>

      {record.chiefComplaint && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-orange-500 mb-0.5">主訴</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
            {record.chiefComplaint}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">針治療の有無</p>
          {record.needleTreatment ? (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                record.needleTreatment === "あり"
                  ? "bg-red-50 text-red-500 border-red-100"
                  : "bg-gray-50 text-gray-500 border-gray-200"
              }`}
            >
              {record.needleTreatment}
            </span>
          ) : (
            <p className="text-xs text-gray-300">—</p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">治療範囲</p>
          {record.treatmentScope ? (
            <span className="text-[10px] font-semibold bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full">
              {record.treatmentScope}
            </span>
          ) : (
            <p className="text-xs text-gray-300">—</p>
          )}
        </div>
      </div>

      {record.needleTreatment === "あり" && record.needleLocation && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-red-500 mb-0.5">針治療の箇所</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
            {record.needleLocation}
          </p>
        </div>
      )}

      {record.overallAssessment && (
        <div>
          <p className="text-xs font-semibold text-green-500 mb-0.5">総評</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
            {record.overallAssessment}
          </p>
        </div>
      )}
    </div>
  );
}
