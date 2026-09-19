"use client";

import dynamic from "next/dynamic";

// react-pdf(pdfjs-dist)はブラウザ専用のAPIに依存しているため、
// PdfViewerLoaderと同様にssr: falseでクライアントのみに限定して読み込む。
// 一覧画面の初回表示では読み込まず、実際に長押しされたときだけ
// コード分割された状態で取得する。
const ResultPeek = dynamic(() => import("@/components/ResultPeek"), {
  ssr: false,
});

export default ResultPeek;
