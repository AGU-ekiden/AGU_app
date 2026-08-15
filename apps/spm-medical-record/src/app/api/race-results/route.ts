import { NextRequest, NextResponse } from "next/server";
import { getRaceResultsByPlayer } from "@/lib/notion";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "playerId は必須です" }, { status: 400 });
  }

  try {
    const results = await getRaceResultsByPlayer(playerId);
    return NextResponse.json(results);
  } catch (err) {
    console.error("Race results GET error:", err);
    return NextResponse.json({ error: "競技結果の取得に失敗しました" }, { status: 500 });
  }
}
