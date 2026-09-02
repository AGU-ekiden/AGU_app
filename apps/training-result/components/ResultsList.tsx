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
  const [results, setResults] = useState<PracticeResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [team, setTeam] = useState<PracticeTeam | "all">("all");
  const [sort, setSort] = useState<SortField>("date");
  const [order, setOrder] = useState<SortOrder>("desc");

  const [jumpMonth, setJumpMonth] = useState("");
  const pendingScrollMonthRef = useRef<string | null>(null);

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort, order });
      if (query) params.set("q", query);
      if (team !== "all") params.set("team", team);

      const res = await fetch(apiPath(`/api/dropbox/list?${params.toString()}`), {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "練習結果の取得に失敗しました");
      }

      setResults(data.results as PracticeResult[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "練習結果の取得に失敗しました"
      );
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [query, team, sort, order]);

  useEffect(() => {
    const timer = setTimeout(fetchResults, 250);
    return () => clearTimeout(timer);
  }, [fetchResults]);

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
          onRefresh={fetchResults}
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

      {!error && isLoading && !results && (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          読み込み中...
        </div>
      )}

      {!error && results && results.length === 0 && (
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
    </div>
  );
}
