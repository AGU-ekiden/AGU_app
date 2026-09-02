"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, Inbox, Loader2 } from "lucide-react";
import type {
  PracticeResult,
  PracticeTeam,
  SortField,
  SortOrder,
} from "@/lib/types";
import FilterBar from "@/components/FilterBar";
import ResultCard from "@/components/ResultCard";
import { apiPath } from "@/lib/api-path";

function monthKeyOf(result: PracticeResult): string {
  return result.practiceDate.slice(0, 7);
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${year}年${Number(month)}月`;
}

export default function ResultsList() {
  // Dropboxから届いた生データ(フィルタ・並び替え前)。ストリーミングで
  // ページが届くたびに追記され、届いた分から順に画面に反映される。
  const [allResults, setAllResults] = useState<PracticeResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [team, setTeam] = useState<PracticeTeam | "all">("all");
  const [sort, setSort] = useState<SortField>("date");
  const [order, setOrder] = useState<SortOrder>("desc");

  const [jumpMonth, setJumpMonth] = useState("");
  const pendingScrollMonthRef = useRef<string | null>(null);

  // 二重読み込み(更新ボタン連打など)で古いストリームの結果が後から
  // 反映されないようにするためのリクエストID
  const requestIdRef = useRef(0);

  const loadAllResults = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setAllResults([]);

    let streamError: string | null = null;
    try {
      const res = await fetch(apiPath("/api/dropbox/list"), {
        cache: "no-store",
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "練習結果の取得に失敗しました");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (requestId !== requestIdRef.current) {
          await reader.cancel().catch(() => {});
          return;
        }
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const parsed = JSON.parse(line) as
            | { batch: PracticeResult[] }
            | { error: string };
          if ("error" in parsed) {
            streamError = parsed.error;
            continue;
          }
          setAllResults((prev) => [...(prev ?? []), ...parsed.batch]);
        }
      }

      if (streamError) throw new Error(streamError);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(
        err instanceof Error ? err.message : "練習結果の取得に失敗しました"
      );
      setAllResults(null);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllResults();
  }, [loadAllResults]);

  // 検索・絞り込み・並び替えはすでに取得済みのデータに対してクライアント側で
  // 行う(変更のたびにDropboxへ再取得しに行くと、フィルタを1回変えるだけで
  // 毎回フォルダ全体の再取得が走ってしまい遅くなるため)。
  const results = useMemo(() => {
    if (!allResults) return null;
    const q = query.trim().toLowerCase();

    let filtered = allResults;
    if (q) {
      filtered = filtered.filter(
        (result) =>
          result.name.toLowerCase().includes(q) ||
          result.title.toLowerCase().includes(q)
      );
    }
    if (team !== "all") {
      filtered = filtered.filter((result) => result.team === team);
    }

    const dir = order === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort === "name") {
        return a.name.localeCompare(b.name, "ja") * dir;
      }
      return (
        (new Date(a.practiceDate).getTime() -
          new Date(b.practiceDate).getTime()) *
        dir
      );
    });
  }, [allResults, query, team, sort, order]);

  // 練習日順（sort === "date"）のときだけ、月ごとにグループ化して見出しを表示する。
  const monthGroups = useMemo(() => {
    if (!results || sort !== "date") return null;
    const groups: { monthKey: string; items: PracticeResult[] }[] = [];
    const indexByMonth = new Map<string, number>();

    for (const result of results) {
      const monthKey = monthKeyOf(result);
      const index = indexByMonth.get(monthKey);
      if (index === undefined) {
        indexByMonth.set(monthKey, groups.length);
        groups.push({ monthKey, items: [result] });
      } else {
        groups[index].items.push(result);
      }
    }

    return groups;
  }, [results, sort]);

  // sortを切り替えた直後は再取得を待つ必要があるため、
  // 移動先の月はrefに保持しておき、resultsが更新されたタイミングでスクロールする。
  useEffect(() => {
    const month = pendingScrollMonthRef.current;
    if (!month || !results) return;
    document
      .getElementById(`month-${month}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    pendingScrollMonthRef.current = null;
  }, [results]);

  const handleJumpMonthChange = (value: string) => {
    setJumpMonth(value);
    if (!value) return;

    if (sort === "date") {
      document
        .getElementById(`month-${value}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    pendingScrollMonthRef.current = value;
    setSort("date");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/85 dark:border-zinc-800 dark:bg-zinc-950/95 dark:supports-[backdrop-filter]:bg-zinc-950/85 sm:-mx-6 sm:px-6">
        <FilterBar
          query={query}
          onQueryChange={setQuery}
          team={team}
          onTeamChange={setTeam}
          sort={sort}
          onSortChange={setSort}
          order={order}
          onOrderToggle={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
          onRefresh={loadAllResults}
          isLoading={isLoading}
        />

        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <label htmlFor="jump-month" className="shrink-0">
            月へ移動:
          </label>
          <input
            id="jump-month"
            type="month"
            value={jumpMonth}
            onChange={(e) => handleJumpMonthChange(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!error && isLoading && (!results || results.length === 0) && (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          読み込み中...
        </div>
      )}

      {!error && !isLoading && results && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-zinc-400">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">該当する練習結果が見つかりませんでした。</p>
        </div>
      )}

      {results && results.length > 0 && monthGroups && (
        <div className="flex flex-col gap-6">
          {monthGroups.map((group) => (
            <div
              key={group.monthKey}
              id={`month-${group.monthKey}`}
              className="flex flex-col gap-3"
            >
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                {formatMonthLabel(group.monthKey)}
              </h2>
              <div className="flex flex-col gap-3">
                {group.items.map((result) => (
                  <ResultCard key={result.id} result={result} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {results && results.length > 0 && !monthGroups && (
        <div className="flex flex-col gap-3">
          {results.map((result) => (
            <ResultCard key={result.id} result={result} />
          ))}
        </div>
      )}

      {!error && isLoading && results && results.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-zinc-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          残りの練習結果を読み込み中...
        </div>
      )}
    </div>
  );
}
