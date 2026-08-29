import type { Metadata, Viewport } from "next";
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
  title: "SPM カルテシステム",
  description: "パーソナルトレーニング記録管理システム",
  // ホーム画面に追加したときのアイコン・表示名(iOS)
  appleWebApp: {
    capable: true,
    title: "SPMカルテ",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#3e8a88",
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
