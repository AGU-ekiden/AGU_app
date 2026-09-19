"use client";

import { useCallback, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import Link from "next/link";
import { Calendar, FileText, HardDrive } from "lucide-react";
import type { PracticeResult } from "@/lib/types";
import { formatDateTime, formatFileSize } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import TeamBadge from "@/components/TeamBadge";
import TagBadge from "@/components/TagBadge";
import ResultPeek from "@/components/ResultPeekLoader";

// 長押しと判定するまでの時間(ms)。短いタップはこれより前に指/マウスが
// 離れるので、そのまま詳細画面への遷移として扱われる。
const LONG_PRESS_MS = 450;

export default function ResultCard({ result }: { result: PracticeResult }) {
  const [peeking, setPeeking] = useState(false);
  const timerRef = useRef<number | null>(null);
  const isLongPressRef = useRef(false);
  const suppressClickRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLAnchorElement>) => {
      // 以降のpointermove/up/cancelを、途中でポインタが要素の外に出ても
      // 確実にこの要素で受け取れるようにする(長押し中に指が少し動いても
      // 押下扱いが途切れないようにするため)。
      event.currentTarget.setPointerCapture(event.pointerId);
      isLongPressRef.current = false;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        isLongPressRef.current = true;
        setPeeking(true);
      }, LONG_PRESS_MS);
    },
    [clearTimer]
  );

  const endPress = useCallback(
    (event: PointerEvent<HTMLAnchorElement>) => {
      clearTimer();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (isLongPressRef.current) {
        // 長押し後に指/マウスを離したときのclickで詳細画面に遷移しない
        // ようにする(長押しはプレビューのみが目的のため)
        suppressClickRef.current = true;
      }
      isLongPressRef.current = false;
      setPeeking(false);
    },
    [clearTimer]
  );

  const handleClick = useCallback((event: MouseEvent) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      suppressClickRef.current = false;
    }
  }, []);

  return (
    <>
      <Link
        href={`/results/${result.id}`}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onContextMenu={(event) => {
          // 長押しでブラウザ標準のコンテキストメニューが出るとプレビューが
          // 隠れてしまうため、長押し中は抑止する
          if (isLongPressRef.current) event.preventDefault();
        }}
        className="group flex select-none flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-[var(--primary)] hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-[var(--primary)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-zinc-900 dark:text-zinc-50">
            <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
            <span className="truncate font-medium">{result.title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TagBadge tag={result.tag} />
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

      {peeking && <ResultPeek result={result} />}
    </>
  );
}
