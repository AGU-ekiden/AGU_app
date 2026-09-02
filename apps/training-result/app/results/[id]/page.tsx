import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { listPracticeResults, resolveResultPath } from "@/lib/practice-results";
import { formatDateTime, formatFileSize } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import TeamBadge from "@/components/TeamBadge";
import PdfViewer from "@/components/PdfViewerLoader";

export default async function ResultDetailPage(
  props: PageProps<"/results/[id]">
) {
  const { id } = await props.params;

  const path = await resolveResultPath(id);
  if (!path) notFound();

  const results = await listPracticeResults();
  const result = results.find((item) => item.id === id);
  if (!result) notFound();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        一覧に戻る
      </Link>

      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {result.title}
          </h1>
          <TeamBadge team={result.team} />
          <StatusBadge status={result.status} />
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400 sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide">練習日</dt>
            <dd className="text-zinc-700 dark:text-zinc-300">
              {result.practiceDate}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">更新日時</dt>
            <dd className="text-zinc-700 dark:text-zinc-300">
              {formatDateTime(result.modifiedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">サイズ</dt>
            <dd className="text-zinc-700 dark:text-zinc-300">
              {formatFileSize(result.size)}
            </dd>
          </div>
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <dt className="text-xs uppercase tracking-wide">パス</dt>
            <dd className="truncate text-zinc-700 dark:text-zinc-300" title={result.path}>
              {result.path}
            </dd>
          </div>
        </dl>
      </div>

      <PdfViewer id={result.id} name={result.name} />
    </div>
  );
}
