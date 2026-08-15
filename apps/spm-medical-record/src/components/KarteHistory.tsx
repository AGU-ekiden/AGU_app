import { KarteRecord } from "@/types/karte";
import KarteCard from "./KarteCard";

interface KarteHistoryProps {
  records: KarteRecord[];
  selectedDate: string | null;
  onCopyTags?: (tags: string[]) => void;
  onCopyTrainingContent?: (content: string) => void;
}

export default function KarteHistory({ records, selectedDate, onCopyTags, onCopyTrainingContent }: KarteHistoryProps) {
  const filtered = selectedDate
    ? records.filter((r) => r.createdAt.startsWith(selectedDate))
    : records;

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

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        {selectedDate?.replace(/-/g, "/")} のカルテはありません
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {filtered.map((record, index) => (
        <KarteCard key={record.id} record={record} index={index} onCopyTags={onCopyTags} onCopyTrainingContent={onCopyTrainingContent} />
      ))}
    </div>
  );
}
