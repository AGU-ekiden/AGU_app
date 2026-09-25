"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { MouseEvent } from "react";

// 詳細画面の「一覧に戻る」。ブラウザ履歴があれば router.back() で
// 戻ることで、一覧画面のコンポーネントをNext.jsのルーターキャッシュから
// 復元し、Dropboxフォルダの再取得をできるだけ避ける
// (一覧は件数が多いと取得に時間がかかり、戻るたびに毎回フルで
// 再取得すると失敗しやすくなるため)。共有リンクなどでこの画面へ
// 直接アクセスされ、戻り先の履歴が無い場合は通常のリンク遷移にする。
export default function BackToListLink() {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      event.preventDefault();
      router.back();
    }
  };

  return (
    <Link
      href="/"
      onClick={handleClick}
      className="inline-flex w-fit items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      <ArrowLeft className="h-4 w-4" />
      一覧に戻る
    </Link>
  );
}
