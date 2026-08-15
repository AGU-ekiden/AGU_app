import { NextResponse } from "next/server";
import { getPlayers } from "@/lib/notion";

export async function GET() {
  try {
    const players = await getPlayers();
    return NextResponse.json(players);
  } catch (err) {
    console.error("Notion players GET error:", err);
    return NextResponse.json({ error: "選手一覧の取得に失敗しました" }, { status: 500 });
  }
}
