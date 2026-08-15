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
  title: "メディカルカルテシステム",
  description: "青山学院陸上部 メディカルトレーナーカルテ管理システム",
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
          href="https://agu-portal.pages.dev/"
          className="fixed top-2 left-2 z-50 inline-flex items-center rounded-md border border-gray-300 bg-white/90 px-2 py-1 text-xs font-bold text-gray-700 shadow-sm backdrop-blur hover:bg-white"
        >
          ← ポータル
        </a>
        {children}
      </body>
    </html>
  );
}
