import Link from "next/link";
import { Calendar, FileText, HardDrive } from "lucide-react";
import type { PracticeResult } from "@/lib/types";
import { formatDateTime, formatFileSize } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import TeamBadge from "@/components/TeamBadge";

export default function ResultCard({ result }: { result: PracticeResult }) {
  return (
    <Link
      href={`/results/${result.id}`}
      className="group flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-zinc-900 dark:text-zinc-50">
          <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
          <span className="truncate font-medium">{result.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TeamBadge team={result.team} />
          <StatusBadge status={result.status} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {result.practiceDate}
        </span>
        <span className="inline-flex items-center gap-1">
          <HardDrive className="h-3.5 w-3.5" />
          {formatFileSize(result.size)}
        </span>
        <span>更新: {formatDateTime(result.modifiedAt)}</span>
      </div>
    </Link>
  );
}
