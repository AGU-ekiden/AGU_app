import { NextRequest, NextResponse } from "next/server";
import { getKarteDatesByPlayer } from "@/lib/notion";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "playerId は必須です" }, { status: 400 });
  }

  try {
    const dates = await getKarteDatesByPlayer(playerId);
    return NextResponse.json({ dates });
  } catch (err) {
    console.error("Notion karte by-player GET error:", err);
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }
}
