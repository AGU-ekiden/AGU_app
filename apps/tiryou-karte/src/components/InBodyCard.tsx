import { InBodyRecord } from "@/types/karte";

interface InBodyCardProps {
  record: InBodyRecord;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}

const FIELDS: { key: keyof InBodyRecord; label: string; unit: string }[] = [
  { key: "weight", label: "体重", unit: "kg" },
  { key: "skeletalMuscleMass", label: "骨格筋量", unit: "kg" },
  { key: "bodyFatMass", label: "体脂肪量", unit: "kg" },
  { key: "bodyFatPercentage", label: "体脂肪率", unit: "%" },
  { key: "bmi", label: "BMI", unit: "" },
  { key: "visceralFatLevel", label: "内臓脂肪レベル", unit: "" },
];

export default function InBodyCard({ record }: InBodyCardProps) {
  const entries = FIELDS.filter((f) => typeof record[f.key] === "number");

  return (
    <div data-anchor-id={`inbody-${record.id}`} className="bg-purple-50 border border-purple-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full">InBody</span>
        <span className="text-xs text-gray-400">{formatDate(record.measuredDate)}</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-gray-400">数値の入力はありません</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {entries.map((f) => (
            <div key={f.key} className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] text-gray-500">{f.label}</span>
              <span className="text-sm font-semibold text-gray-800">
                {record[f.key] as number}
                {f.unit && <span className="text-[10px] text-gray-400 font-normal"> {f.unit}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {record.memo && (
        <div className="mt-3 pt-2 border-t border-purple-100">
          <p className="text-xs font-semibold text-purple-500 mb-0.5">メモ</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{record.memo}</p>
        </div>
      )}
    </div>
  );
}
