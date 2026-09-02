import { CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
import type { PracticeStatus } from "@/lib/types";

const STYLES: Record<
  PracticeStatus,
  { label: string; className: string; Icon: LucideIcon } | null
> = {
  pass: {
    label: "合格",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
    Icon: CheckCircle2,
  },
  fail: {
    label: "不合格",
    className:
      "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/30",
    Icon: XCircle,
  },
  // ファイル名から合否を判定できない場合はバッジを表示しない
  unclassified: null,
};

export default function StatusBadge({ status }: { status: PracticeStatus }) {
  const style = STYLES[status];
  if (!style) return null;

  const { label, className, Icon } = style;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
