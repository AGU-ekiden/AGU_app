"use client";

import { createPortal } from "react-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2 } from "lucide-react";
import { apiPath } from "@/lib/api-path";
import type { PracticeResult } from "@/lib/types";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// 長押し中だけ表示するPDF1ページ目のプレビュー。指を離すとすぐ消える
// ことを優先し、ページ送り・ズームなどの操作は持たない(詳細画面の
// PdfViewerとは別の、あくまで「覗き見」用の軽量コンポーネント)。
//
// ResultPeekLoaderがnext/dynamicでssr: falseとして読み込むため、
// このコンポーネントはサーバーでは一切評価されず、常にブラウザ上でだけ
// マウントされる。そのためdocument.bodyへのcreatePortalをマウント判定
// 無しでそのまま呼んでよい。
export default function ResultPeek({ result }: { result: PracticeResult }) {
  const src = apiPath(`/api/dropbox/file?id=${encodeURIComponent(result.id)}`);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="truncate border-b border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
          {result.title}
        </div>
        <div className="flex-1 overflow-hidden bg-zinc-100 p-2 dark:bg-zinc-800">
          <Document
            file={src}
            loading={
              <div className="flex h-48 items-center justify-center gap-2 text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                読み込み中...
              </div>
            }
            error={
              <div className="flex h-48 items-center justify-center text-center text-sm text-zinc-400">
                プレビューできませんでした
              </div>
            }
          >
            <Page
              pageNumber={1}
              width={320}
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          </Document>
        </div>
      </div>
    </div>,
    document.body
  );
}
