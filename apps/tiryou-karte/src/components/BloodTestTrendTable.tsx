import { Fragment } from "react";
import { BloodTestRecord } from "@/types/karte";
import { BLOOD_TEST_CATEGORIES, getReferenceRange } from "@/lib/bloodTestItems";

interface BloodTestTrendTableProps {
  records: BloodTestRecord[];
  playerGender?: string;
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", { year: "2-digit", month: "numeric", day: "numeric" });
}

export default function BloodTestTrendTable({ records, playerGender }: BloodTestTrendTableProps) {
  if (records.length === 0) return null;

  const sorted = [...records].sort((a, b) => a.testDate.localeCompare(b.testDate));
  const enteredKeys = new Set<string>();
  sorted.forEach((r) => Object.keys(r.values).forEach((k) => enteredKeys.add(k)));

  const categoriesWithData = BLOOD_TEST_CATEGORIES.map((cat) => ({
    category: cat.category,
    items: cat.items.filter((item) => enteredKeys.has(item.key)),
  })).filter((cat) => cat.items.length > 0);

  if (categoriesWithData.length === 0) return null;

  return (
    <div className="mt-6 pt-5 border-t border-gray-100">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">血液検査 推移</h3>
      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="border-collapse text-xs min-w-max w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 text-left px-3 py-2 font-semibold text-gray-500 border-b border-r border-gray-100 whitespace-nowrap">
                項目
              </th>
              {sorted.map((r) => (
                <th
                  key={r.id}
                  className="px-3 py-2 font-semibold text-gray-500 border-b border-gray-100 whitespace-nowrap text-right"
                >
                  {formatDateShort(r.testDate)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categoriesWithData.map((cat) => (
              <Fragment key={cat.category}>
                <tr className="bg-gray-50/60">
                  <td
                    colSpan={sorted.length + 1}
                    className="sticky left-0 px-3 py-1 text-[10px] font-bold text-gray-400 border-b border-gray-100 bg-gray-50/60"
                  >
                    {cat.category}
                  </td>
                </tr>
                {cat.items.map((item) => {
                  const range = getReferenceRange(item, playerGender);
                  return (
                    <tr key={item.key} className="hover:bg-gray-50">
                      <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-gray-600 border-b border-r border-gray-100 whitespace-nowrap">
                        {item.key}
                        {item.unit && <span className="text-[10px] text-gray-400"> ({item.unit})</span>}
                      </td>
                      {sorted.map((r) => {
                        const value = r.values[item.key];
                        const outOfRange = range && value !== undefined ? value < range[0] || value > range[1] : false;
                        return (
                          <td
                            key={r.id}
                            className={`px-3 py-1.5 text-right border-b border-gray-100 whitespace-nowrap ${
                              outOfRange ? "text-red-600 font-semibold" : "text-gray-700"
                            }`}
                          >
                            {value !== undefined ? value : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
