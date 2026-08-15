import { BloodTestRecord } from "@/types/karte";
import { BLOOD_TEST_CATEGORIES, getBloodTestItem, getReferenceRange } from "@/lib/bloodTestItems";

interface BloodTestCardProps {
  record: BloodTestRecord;
  playerGender?: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}

export default function BloodTestCard({ record, playerGender }: BloodTestCardProps) {
  const enteredKeys = Object.keys(record.values);
  const categoriesWithData = BLOOD_TEST_CATEGORIES.map((cat) => ({
    category: cat.category,
    items: cat.items.filter((item) => enteredKeys.includes(item.key)),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div data-anchor-id={`blood-${record.id}`} className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">血液検査</span>
        <span className="text-xs text-gray-400">{formatDate(record.testDate)}</span>
      </div>

      {categoriesWithData.length === 0 ? (
        <p className="text-xs text-gray-400">数値の入力はありません</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {categoriesWithData.map((cat) => (
            <div key={cat.category}>
              <p className="text-[10px] font-bold text-gray-400 mb-1">{cat.category}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {cat.items.map((item) => {
                  const value = record.values[item.key];
                  const range = getReferenceRange(item, playerGender);
                  const outOfRange = range ? value < range[0] || value > range[1] : false;
                  return (
                    <div key={item.key} className="flex items-baseline justify-between gap-2" title={getBloodTestItem(item.key)?.memo}>
                      <span className="text-[11px] text-gray-500 truncate">{item.key}</span>
                      <span className={`text-xs font-semibold shrink-0 ${outOfRange ? "text-red-600" : "text-gray-800"}`}>
                        {value}
                        {item.unit && <span className="text-[10px] text-gray-400 font-normal"> {item.unit}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {record.memo && (
        <div className="mt-3 pt-2 border-t border-red-100">
          <p className="text-xs font-semibold text-red-500 mb-0.5">メモ</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{record.memo}</p>
        </div>
      )}
    </div>
  );
}
