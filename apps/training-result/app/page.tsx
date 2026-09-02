import ResultsList from "@/components/ResultsList";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          練習結果
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Dropboxに保存された練習結果（PDF）の一覧です。
        </p>
      </div>
      <ResultsList />
    </div>
  );
}
