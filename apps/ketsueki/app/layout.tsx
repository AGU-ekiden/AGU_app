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
  title: "血液検査データ分析",
  description: "選手の血液検査データの推移と寮別比較・学年別比較",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* ポータルはこのアプリのbasePath(/ketsueki)の外なので、next/linkではなく素のaタグでフルページ遷移する */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="fixed left-2 top-2 z-50 inline-flex items-center rounded-md px-2 py-1 text-xs font-bold shadow-sm"
          style={{ background: "var(--brand)", color: "#ffffff" }}
        >
          ← ポータル
        </a>
        {children}
      </body>
    </html>
  );
}
