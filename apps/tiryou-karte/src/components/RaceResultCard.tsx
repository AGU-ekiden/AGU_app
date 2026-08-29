import { RaceResult } from "@/types/karte";

interface RaceResultCardProps {
  result: RaceResult;
}

const FLAG_COLORS: Record<string, string> = {
  PB: "bg-red-100 text-red-600 border-red-200",
  SB: "bg-amber-100 text-amber-800 border-amber-200",
  "優勝": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "入賞": "bg-orange-100 text-orange-600 border-orange-200",
  "準優勝": "bg-gray-100 text-gray-600 border-gray-200",
  "決勝進出": "bg-red-100 text-red-600 border-red-200",
  "区間賞": "bg-pink-100 text-pink-600 border-pink-200",
  "青学記録": "bg-amber-100 text-amber-800 border-amber-200",
  "初レース": "bg-pink-100 text-pink-500 border-pink-200",
  "大会新": "bg-orange-100 text-orange-700 border-orange-200",
};

function formatRaceDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export default function RaceResultCard({ result }: RaceResultCardProps) {
  return (
    <div data-anchor-id={`race-${result.id}`} className="bg-orange-50 border border-orange-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">大会</span>
        <span className="text-xs text-gray-400">{formatRaceDate(result.date)}</span>
      </div>
      <p className="font-semibold text-sm text-gray-800 leading-tight mb-2">{result.competitionName}</p>
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        {result.eventName && (
          <span className="text-xs text-gray-500">{result.eventName}</span>
        )}
        {result.result && (
          <span className="text-xs font-bold text-gray-800">{result.result}</span>
        )}
        {result.rank != null && (
          <span className="text-xs text-gray-500">{result.rank}位</span>
        )}
        {result.venue && (
          <span className="text-[10px] text-gray-400">{result.venue}</span>
        )}
      </div>
      {result.flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {result.flags.map((flag) => (
            <span
              key={flag}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${FLAG_COLORS[flag] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}
            >
              {flag}
            </span>
          ))}
        </div>
      )}
      {result.notes && (
        <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">{result.notes}</p>
      )}
    </div>
  );
}
