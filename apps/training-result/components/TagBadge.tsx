import type { PracticeTag } from "@/lib/types";

const STYLES: Record<PracticeTag, { label: string; className: string }> = {
  practice: {
    label: "練習",
    className:
      "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-zinc-500/30",
  },
  match_tt: {
    label: "試合・TT",
    className:
      "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/30",
  },
};

export default function TagBadge({ tag }: { tag: PracticeTag }) {
  const { label, className } = STYLES[tag];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}
