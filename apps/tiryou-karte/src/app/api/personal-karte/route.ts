import { NextRequest, NextResponse } from "next/server";
import { getPersonalKartesByPlayer } from "@/lib/notion";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "playerId は必須です" }, { status: 400 });
  }

  try {
    const records = await getPersonalKartesByPlayer(playerId);
    return NextResponse.json(records);
  } catch (err) {
    console.error("Notion personal-karte GET error:", err);
    return NextResponse.json({ error: "パーソナルカルテの取得に失敗しました" }, { status: 500 });
  }
}
