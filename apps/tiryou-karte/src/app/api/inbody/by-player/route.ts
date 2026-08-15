import { NextRequest, NextResponse } from "next/server";
import { getInBodyDatesByPlayer } from "@/lib/notion";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "playerId は必須です" }, { status: 400 });
  }

  try {
    const dates = await getInBodyDatesByPlayer(playerId);
    return NextResponse.json({ dates });
  } catch (err) {
    console.error("Notion inbody by-player GET error:", err);
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }
}
