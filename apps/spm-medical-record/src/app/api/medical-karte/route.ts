import { NextRequest, NextResponse } from "next/server";
import { getMedicalKartesByPlayer } from "@/lib/notion";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "playerId は必須です" }, { status: 400 });
  }

  try {
    const results = await getMedicalKartesByPlayer(playerId);
    return NextResponse.json(results);
  } catch (err) {
    console.error("Medical karte GET error:", err);
    return NextResponse.json({ error: "メディカルカルテの取得に失敗しました" }, { status: 500 });
  }
}
