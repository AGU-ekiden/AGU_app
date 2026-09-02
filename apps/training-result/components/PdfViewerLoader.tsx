"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// react-pdf(pdfjs-dist)はブラウザ専用のAPI（DOMMatrixなど）に依存しており、
// サーバーサイドレンダリング時にNode.js環境で評価するとエラーになる。
// そのためssr: falseでクライアントのみに限定して読み込む。
const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[80vh] w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
      <Loader2 className="h-5 w-5 animate-spin" />
      PDFを読み込み中...
    </div>
  ),
});

export default PdfViewer;
