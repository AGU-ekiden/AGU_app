import { NextRequest, NextResponse } from "next/server";
import { getDropboxClient } from "@/lib/dropbox";
import { resolveResultPath } from "@/lib/practice-results";

// DropboxのアクセストークンをクライアントへJSONで渡さないよう、
// ここでファイル本体をダウンロードしてそのままストリームとして中継する。
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "idが指定されていません" }, { status: 400 });
  }

  const path = await resolveResultPath(id);
  if (!path) {
    return NextResponse.json({ error: "不正なidです" }, { status: 400 });
  }

  try {
    const dbx = getDropboxClient();
    const response = await dbx.filesDownload({ path });
    const { fileBinary, fileBlob } = response.result;

    // dropbox SDKはバンドル環境ではNode.jsでもブラウザ判定になり、
    // fileBinaryの代わりにfileBlobを返すことがあるため両方に対応する。
    const bytes = fileBinary
      ? Buffer.from(fileBinary)
      : fileBlob
        ? Buffer.from(await fileBlob.arrayBuffer())
        : null;

    if (!bytes) {
      return NextResponse.json(
        { error: "ファイルを取得できませんでした" },
        { status: 404 }
      );
    }

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          response.result.name
        )}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("Failed to download Dropbox file:", error);
    return NextResponse.json(
      { error: "PDFのダウンロードに失敗しました" },
      { status: 502 }
    );
  }
}
