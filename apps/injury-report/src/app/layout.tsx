import type { Metadata } from "next";
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
  title: "故障者報告",
  description: "毎週金曜日の故障状況報告(選手入力・トレーナー確認用)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* ポータルはこのアプリのbasePath(/injury-report)の外なので、
            next/linkではなく素のaタグでフルページ遷移する */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="fixed top-2 left-2 z-50 inline-flex items-center rounded-md bg-[#3e8a88] px-2 py-1 text-xs font-bold text-white shadow-sm hover:bg-[#2c6462]"
        >
          ← ポータル
        </a>
        {children}
      </body>
    </html>
  );
}
