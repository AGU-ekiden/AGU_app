import { NextResponse } from "next/server";
import { getTagOptions } from "@/lib/notion";

export async function GET() {
  try {
    const tags = await getTagOptions();
    return NextResponse.json(tags);
  } catch (err) {
    console.error("Tags GET error:", err);
    return NextResponse.json({ error: "タグ一覧の取得に失敗しました" }, { status: 500 });
  }
}
