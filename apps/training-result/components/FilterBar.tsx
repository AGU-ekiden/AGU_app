"use client";

import { ArrowUpDown, RefreshCw, Search } from "lucide-react";
import type { PracticeTeam, SortField, SortOrder } from "@/lib/types";

interface FilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  team: PracticeTeam | "all";
  onTeamChange: (value: PracticeTeam | "all") => void;
  sort: SortField;
  onSortChange: (value: SortField) => void;
  order: SortOrder;
  onOrderToggle: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const selectClassName =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";

const buttonClassName =
  "inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

export default function FilterBar({
  query,
  onQueryChange,
  team,
  onTeamChange,
  sort,
  onSortChange,
  order,
  onOrderToggle,
  onRefresh,
  isLoading,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="ファイル名で検索"
          className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={team}
          onChange={(event) =>
            onTeamChange(event.target.value as PracticeTeam | "all")
          }
          className={selectClassName}
        >
          <option value="all">男女すべて</option>
          <option value="male">男子</option>
          <option value="female">女子</option>
          <option value="camp">合宿</option>
        </select>

        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortField)}
          className={selectClassName}
        >
          <option value="date">練習日で並び替え</option>
          <option value="name">ファイル名で並び替え</option>
        </select>

        <button type="button" onClick={onOrderToggle} className={buttonClassName}>
          <ArrowUpDown className="h-4 w-4" />
          {order === "desc" ? "降順" : "昇順"}
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className={buttonClassName}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          更新
        </button>
      </div>
    </div>
  );
}
