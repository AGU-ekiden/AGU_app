import { MedicalKarteRecord } from "@/types/karte";

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

export default function MedicalKarteCard({ record, index }: { record: MedicalKarteRecord; index: number }) {
  return (
    <div className="bg-white border border-green-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
          #{index + 1}
        </span>
        <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-100">
          メディカル
        </span>
        <span className="text-xs text-gray-400">
          {formatDate(record.createdAt)} {formatTime(record.createdAt)}
        </span>
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
          {record.acupuncturePresent ? (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                record.acupuncturePresent === "あり"
                  ? "bg-red-50 text-red-500 border-red-100"
                  : "bg-gray-50 text-gray-500 border-gray-200"
              }`}
            >
              {record.acupuncturePresent}
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

      {record.acupuncturePresent === "あり" && record.acupunctureLocation && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-red-500 mb-0.5">針治療の箇所</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
            {record.acupunctureLocation}
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
