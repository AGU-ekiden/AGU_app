import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "練習結果ビューア",
  description: "Dropboxに保存された練習結果PDFを閲覧するアプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <header className="border-b-[3px] border-[var(--primary)] bg-white dark:bg-zinc-900">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Dumbbell className="h-5 w-5 text-[var(--primary)]" />
              練習結果ビューア
            </Link>
            <a
              href="/"
              className="ml-auto inline-flex h-9 shrink-0 items-center rounded-[10px] bg-[var(--primary)] px-2.5 text-xs font-bold text-white hover:bg-[var(--primary-dark)]"
            >
              ← ポータル
            </a>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
