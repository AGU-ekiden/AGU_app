import { NextRequest, NextResponse } from "next/server";
import { getPlayerById } from "@/lib/notion";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await params;
  try {
    const player = await getPlayerById(playerId);
    if (!player) {
      return NextResponse.json({ error: "選手が見つかりません" }, { status: 404 });
    }
    return NextResponse.json(player);
  } catch (err) {
    console.error("Notion player GET error:", err);
    return NextResponse.json({ error: "選手情報の取得に失敗しました" }, { status: 500 });
  }
}
