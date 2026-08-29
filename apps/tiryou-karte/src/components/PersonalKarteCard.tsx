import { PersonalKarteRecord } from "@/types/karte";

interface PersonalKarteCardProps {
  record: PersonalKarteRecord;
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

export default function PersonalKarteCard({ record }: PersonalKarteCardProps) {
  return (
    <div data-anchor-id={`personal-${record.id}`} className="bg-amber-50 border border-amber-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">パーソナル</span>
        <span className="text-xs text-gray-400">
          {formatDate(record.createdAt)} {formatTime(record.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">担当トレーナー</p>
          <p className="text-sm font-semibold text-gray-800">{record.trainerName || "—"}</p>
        </div>
        {record.location && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">場所</p>
            <p className="text-sm font-semibold text-gray-800">{record.location}</p>
          </div>
        )}
        {record.tags.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">タグ</p>
            <div className="flex flex-wrap gap-1">
              {record.tags.map((tag) => (
                <span key={tag} className="text-[10px] bg-white text-amber-800 px-1.5 py-0.5 rounded-full font-medium border border-amber-100">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {record.chiefComplaint && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-orange-500 mb-0.5">主訴</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{record.chiefComplaint}</p>
        </div>
      )}
      {record.physicalCheck && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-purple-500 mb-0.5">状態（フィジカルチェック）</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{record.physicalCheck}</p>
        </div>
      )}
      {record.procedureContent && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-teal-500 mb-0.5">実施内容</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{record.procedureContent}</p>
        </div>
      )}
      {record.trainingContent && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-amber-700 mb-0.5">トレーニング内容</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{record.trainingContent}</p>
        </div>
      )}
      {record.memo && (
        <div>
          <p className="text-xs font-semibold text-green-500 mb-0.5">memo</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{record.memo}</p>
        </div>
      )}
    </div>
  );
}
