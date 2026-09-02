import type { PracticeTeam } from "@/lib/types";

const STYLES: Record<PracticeTeam, { label: string; className: string }> = {
  male: {
    label: "男子",
    className:
      "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30",
  },
  female: {
    label: "女子",
    className:
      "bg-pink-50 text-pink-700 ring-pink-600/20 dark:bg-pink-500/10 dark:text-pink-400 dark:ring-pink-500/30",
  },
  camp: {
    label: "合宿",
    className:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
  },
};

export default function TeamBadge({ team }: { team: PracticeTeam }) {
  const { label, className } = STYLES[team];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}
