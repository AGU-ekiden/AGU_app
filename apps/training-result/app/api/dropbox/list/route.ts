import { iteratePracticeResultBatches } from "@/lib/practice-results";
import type { PracticeResult } from "@/lib/types";

// Dropbox上のPDF一覧はNDJSON(1行1 JSON)でストリーミング配信する。
// フォルダの再帰一覧は複数ページに渡ることがあり、全ページが揃うまで
// 待たずに、届いたページから順にクライアントへ送って先に表示できる
// ようにするため。検索・絞り込み・並び替えはクライアント側で行う。
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const batch of iteratePracticeResultBatches()) {
          const line: { batch: PracticeResult[] } = { batch };
          controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"));
        }
      } catch (error) {
        console.error("Failed to list Dropbox practice results:", error);
        const message =
          error instanceof Error ? error.message : "練習結果の取得に失敗しました";
        controller.enqueue(encoder.encode(JSON.stringify({ error: message }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
