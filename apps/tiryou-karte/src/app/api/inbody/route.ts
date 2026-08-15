import { NextRequest, NextResponse } from "next/server";
import { getInBodyRecordsByPlayer } from "@/lib/notion";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "playerId は必須です" }, { status: 400 });
  }

  try {
    const records = await getInBodyRecordsByPlayer(playerId);
    return NextResponse.json(records);
  } catch (err) {
    console.error("Notion inbody GET error:", err);
    return NextResponse.json({ error: "InBody記録の取得に失敗しました" }, { status: 500 });
  }
}
