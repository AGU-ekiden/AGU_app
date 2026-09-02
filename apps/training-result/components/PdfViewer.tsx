"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { apiPath } from "@/lib/api-path";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfViewerProps {
  id: string;
  name: string;
}

const iconButtonClassName =
  "inline-flex items-center justify-center rounded-md border border-zinc-300 p-2 text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

export default function PdfViewer({ id, name }: PdfViewerProps) {
  const src = apiPath(`/api/dropbox/file?id=${encodeURIComponent(id)}`);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setError(null);
  }, []);

  const handleLoadError = useCallback(() => {
    setError("PDFを表示できませんでした。ダウンロードしてご確認ください。");
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <ExternalLink className="h-4 w-4" />
          新しいタブで開く
        </a>
        <a
          href={src}
          download={name}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Download className="h-4 w-4" />
          ダウンロード
        </a>
      </div>

      <div
        ref={containerRef}
        className="relative h-[80vh] w-full touch-none overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800"
      >
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
            <AlertTriangle className="h-6 w-6" />
            <p className="px-4 text-center text-sm">{error}</p>
          </div>
        )}

        {!error && containerWidth > 0 && (
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={6}
            centerOnInit
            doubleClick={{ mode: "toggle" }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent
                  wrapperClass="!h-full !w-full"
                  contentClass="!flex !h-full !w-full !items-center !justify-center"
                >
                  <Document
                    file={src}
                    onLoadSuccess={handleLoadSuccess}
                    onLoadError={handleLoadError}
                    loading={
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        PDFを読み込み中...
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={Math.min(containerWidth - 16, 900)}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                    />
                  </Document>
                </TransformComponent>

                <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md border border-zinc-300 bg-white/95 p-1 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
                  <button
                    type="button"
                    onClick={() => zoomOut()}
                    className={iconButtonClassName}
                    aria-label="縮小"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => zoomIn()}
                    className={iconButtonClassName}
                    aria-label="拡大"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => resetTransform()}
                    className={iconButtonClassName}
                    aria-label="拡大率をリセット"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </TransformWrapper>
        )}

        {!error && numPages && numPages > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-md border border-zinc-300 bg-white/95 px-2 py-1 text-sm text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-200">
            <button
              type="button"
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className={iconButtonClassName}
              aria-label="前のページ"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tabular-nums">
              {pageNumber} / {numPages}
            </span>
            <button
              type="button"
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              className={iconButtonClassName}
              aria-label="次のページ"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
