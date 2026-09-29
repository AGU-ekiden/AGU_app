"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { AlertTriangle, CalendarDays, Inbox, Loader2 } from "lucide-react";
import type {
  PracticeResult,
  PracticeTag,
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

// 絞り込み・並び替え・スクロール位置を一覧離脱後も保持するための
// セッションストレージのキー。詳細画面から「一覧に戻る」で戻ってきたときに、
// 最初の状態からではなく直前の閲覧状態から再開できるようにするため。
const SESSION_STATE_KEY = "training-result:list-state";

interface SavedListState {
  query: string;
  team: PracticeTeam | "all";
  tag: PracticeTag | "all";
  sort: SortField;
  order: SortOrder;
  scrollY: number;
}

const DEFAULT_SAVED_STATE: SavedListState = {
  query: "",
  team: "all",
  tag: "all",
  sort: "date",
  order: "desc",
  scrollY: 0,
};

function readSavedState(): SavedListState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedListState;
  } catch {
    return null;
  }
}

// 一覧データそのものもセッション内に一時保存しておき、詳細画面から戻った
// ときはDropboxへの再取得(数秒かかる)を待たずに即座に同じ一覧を表示する。
// これにより、元のスクロール位置へすぐに戻れる。古くなりすぎないよう
// 一定時間で失効させ、「更新」ボタンではいつでも取り直せる。
const LIST_CACHE_KEY = "training-result:list-cache";
const LIST_CACHE_TTL_MS = 10 * 60 * 1000;

function readListCache(): PracticeResult[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LIST_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; results: PracticeResult[] };
    if (!Array.isArray(parsed.results)) return null;
    if (Date.now() - parsed.savedAt > LIST_CACHE_TTL_MS) return null;
    return parsed.results;
  } catch {
    return null;
  }
}

function writeListCache(results: PracticeResult[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      LIST_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), results })
    );
  } catch {
    // 容量オーバー等で保存できなくても、毎回取得し直すだけなので無視する
  }
}

function writeSavedState(partial: Partial<SavedListState>) {
  if (typeof window === "undefined") return;
  try {
    const current = readSavedState();
    // scrollYだけを保存するスクロール監視など、partialが一部のキーしか
    // 持たないことがある。currentがnull(何も保存されていない)の場合に
    // {...current, ...partial}だけだとquery/team/等が欠けたオブジェクトが
    // 保存されてしまい、復元時にqueryがundefinedのままuseMemoでtrim()を
    // 呼んでクラッシュする不具合があったため、必ずデフォルト値をベースにする。
    const next = { ...DEFAULT_SAVED_STATE, ...current, ...partial };
    window.sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(next));
  } catch {
    // sessionStorageが使えない環境では単に保持しないだけにする
  }
}

export default function ResultsList() {
  // Dropboxから届いた生データ(フィルタ・並び替え前)。ストリーミングで
  // ページが届くたびに追記され、届いた分から順に画面に反映される。
  const [allResults, setAllResults] = useState<PracticeResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [team, setTeam] = useState<PracticeTeam | "all">("all");
  const [tag, setTag] = useState<PracticeTag | "all">("all");
  const [sort, setSort] = useState<SortField>("date");
  const [order, setOrder] = useState<SortOrder>("desc");

  const [jumpMonth, setJumpMonth] = useState("");
  const pendingScrollMonthRef = useRef<string | null>(null);
  // 詳細画面から戻ってきた直後、最初の1回だけスクロール位置を復元するためのフラグ
  const pendingScrollRestoreRef = useRef(true);
  // 復元先のスクロール位置。マウント直後に一度だけ読み取って確保しておく
  // (読み込み中にページが短い状態で発生するスクロールイベントによって、
  // 保存値が0に上書きされてしまうのを防ぐため)
  const restoreScrollYRef = useRef<number | null>(null);
  // 詳細画面へ遷移する瞬間以降はスクロール位置を保存しない
  // (遷移時に先頭へスクロールされ、その0で上書きされるのを防ぐため)
  const freezeScrollSaveRef = useRef(false);

  // 二重読み込み(更新ボタン連打など)で古いストリームの結果が後から
  // 反映されないようにするためのリクエストID
  const requestIdRef = useRef(0);

  const loadAllResults = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setAllResults([]);

    let streamError: string | null = null;
    const collected: PracticeResult[] = [];
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
          collected.push(...parsed.batch);
          setAllResults((prev) => [...(prev ?? []), ...parsed.batch]);
        }
      }

      if (streamError) throw new Error(streamError);
      writeListCache(collected);
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

  // 保存済みの絞り込み・並び替え状態・一覧データをマウント後に復元する。
  // useStateの初期値でsessionStorageを直接読むと、サーバー側の初回レンダリング
  // (常にデフォルト値)とクライアント側の初回レンダリングがズレて
  // hydrationエラーになるため、マウント後のeffect内でのみ行う。
  useEffect(() => {
    // ブラウザ標準のスクロール位置復元と競合しないよう、自前で管理する
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const saved = readSavedState();
    restoreScrollYRef.current = saved?.scrollY ?? null;

    const cached = readListCache();
    if (cached) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setAllResults(cached);
      setIsLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    } else {
      loadAllResults();
    }

    if (!saved) return;
    // マウント直後の1回だけ、外部(sessionStorage)から状態を同期する
    // (hydration安全のためuseStateの初期値では読めないので、ここが唯一の入口)。
    // 保存内容が(古いバージョン由来などで)一部欠けていてもクラッシュしない
    // よう、各フィールドはundefinedなら復元しない(現在の初期値のまま)。
    if (saved.query !== undefined) setQuery(saved.query);
    if (saved.team !== undefined) setTeam(saved.team);
    if (saved.tag !== undefined) setTag(saved.tag);
    if (saved.sort !== undefined) setSort(saved.sort);
    if (saved.order !== undefined) setOrder(saved.order);
  }, [loadAllResults]);

  // 絞り込み・並び替え条件が変わるたびに保存しておく（詳細画面から
  // 「一覧に戻る」で戻ってきたときに、変更のたびに毎回保存しておく
  // ことで最新の状態を復元できるようにするため）。上の復元effectが
  // マウント直後にデフォルト値のまま走ってしまい、直後に来る復元前の
  // 状態でsessionStorageを上書きしないよう、初回のこの effect 実行はスキップする。
  const skipNextPersistRef = useRef(true);
  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    writeSavedState({ query, team, tag, sort, order });
  }, [query, team, tag, sort, order]);

  // スクロール位置も同様に、変更のたびに保存しておく。ただし、戻ってきた
  // 直後の復元が終わるまでと、詳細画面へ遷移した後は保存しない(どちらも
  // ページ先頭=0で保存値を上書きしてしまい、元の位置に戻れなくなるため)。
  useEffect(() => {
    let frame: number | null = null;
    const handleScroll = () => {
      if (pendingScrollRestoreRef.current || freezeScrollSaveRef.current) return;
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        if (pendingScrollRestoreRef.current || freezeScrollSaveRef.current) return;
        writeSavedState({ scrollY: window.scrollY });
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  // 検索・絞り込み・並び替えはすでに取得済みのデータに対してクライアント側で
  // 行う(変更のたびにDropboxへ再取得しに行くと、フィルタを1回変えるだけで
  // 毎回フォルダ全体の再取得が走ってしまい遅くなるため)。
  const results = useMemo(() => {
    if (!allResults) return null;
    const q = (query ?? "").trim().toLowerCase();

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
    if (tag !== "all") {
      filtered = filtered.filter((result) => result.tag === tag);
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
  }, [allResults, query, team, tag, sort, order]);

  // データの初回読み込みが完了したタイミングで、一度だけ保存済みの
  // スクロール位置へ復元する（詳細画面から戻ってきた直後の初期表示のみ。
  // 「更新」ボタンでの再読み込み時は復元しない）。
  useEffect(() => {
    if (isLoading || !results) return;
    if (!pendingScrollRestoreRef.current) return;

    const targetY = restoreScrollYRef.current;
    if (!targetY) {
      pendingScrollRestoreRef.current = false;
      return;
    }
    // レイアウト(一覧の描画)が確定してからスクロールする
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: targetY });
        pendingScrollRestoreRef.current = false;
      });
    });
  }, [isLoading, results]);

  // カードをクリックして詳細画面へ移る瞬間のスクロール位置を確実に保存する
  const handleListClickCapture = (event: MouseEvent) => {
    // 新しいタブで開く(Ctrl/Cmd+クリック等)場合はこの画面に留まるので対象外
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    if (pendingScrollRestoreRef.current) return;
    writeSavedState({ scrollY: window.scrollY });
    freezeScrollSaveRef.current = true;
  };

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
          tag={tag}
          onTagChange={setTag}
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
        <div className="flex flex-col gap-6" onClickCapture={handleListClickCapture}>
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
        <div className="flex flex-col gap-3" onClickCapture={handleListClickCapture}>
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
