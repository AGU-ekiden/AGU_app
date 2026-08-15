import { BloodTestRecord } from "@/types/karte";
import { BLOOD_TEST_CATEGORIES, getReferenceRange } from "@/lib/bloodTestItems";

function formatDate(dateStr: string): string {
  if (!dateStr) return "日付不明";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export default function BloodTestCard({
  record,
  index,
  gender,
}: {
  record: BloodTestRecord;
  index: number;
  gender?: string;
}) {
  return (
    <div
      data-anchor-id={`blood-${record.id}`}
      className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
          #{index + 1}
        </span>
        <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">
          血液検査
        </span>
        <span className="text-xs text-gray-400">{formatDate(record.testDate)}</span>
      </div>

      <p className="text-sm font-semibold text-gray-800 mb-3">{record.clientName}</p>

      <div className="space-y-3">
        {BLOOD_TEST_CATEGORIES.map((cat) => {
          const filledItems = cat.items.filter(
            (item) => record.values[item.key] != null
          );
          if (filledItems.length === 0) return null;
          return (
            <div key={cat.label}>
              <p className="text-[10px] font-bold text-red-400 tracking-wide mb-1.5">
                {cat.label}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {filledItems.map((item) => {
                  const value = record.values[item.key]!;
                  const range = getReferenceRange(item, gender);
                  const isOutOfRange =
                    range != null && (value < range[0] || value > range[1]);
                  const isLow = range != null && value < range[0];
                  return (
                    <div key={item.key} className="flex items-baseline gap-1 min-w-0">
                      <span className="text-[10px] text-gray-500 shrink-0">{item.name}</span>
                      <span
                        className={`text-xs font-bold shrink-0 ${
                          isOutOfRange ? "text-red-600" : "text-gray-800"
                        }`}
                      >
                        {value}
                      </span>
                      <span className="text-[9px] text-gray-400 shrink-0">{item.unit}</span>
                      {isOutOfRange && (
                        <span
                          className={`text-[9px] font-bold shrink-0 ${
                            isLow ? "text-blue-500" : "text-red-500"
                          }`}
                        >
                          {isLow ? "▼" : "▲"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {record.memo && (
        <div className="mt-3 pt-2 border-t border-red-100">
          <p className="text-[11px] text-gray-500 whitespace-pre-wrap leading-relaxed">
            {record.memo}
          </p>
        </div>
      )}
    </div>
  );
}
