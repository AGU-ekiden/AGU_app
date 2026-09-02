import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "練習日誌",
  description: "AGU駅伝部 練習日誌アプリ(Garmin/COROS→Strava連携)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50">
        {/* basePath("/training-log")の外、ポータルのルートへ戻るリンクのため
            next/link ではなく通常の<a>を使う(LinkだとbasePathが付いてしまう) */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="fixed top-2 left-2 z-50 inline-flex items-center rounded-md bg-green-700 px-2 py-1 text-xs font-bold text-white shadow-sm hover:bg-green-600"
        >
          ← ポータル
        </a>
        {children}
      </body>
    </html>
  );
}
