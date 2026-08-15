import { NextResponse } from "next/server";
import { getObogPlayers } from "@/lib/notion";

export async function GET() {
  try {
    const players = await getObogPlayers();
    return NextResponse.json(players);
  } catch (err) {
    console.error("Notion GET error:", err);
    return NextResponse.json({ error: "OBOGの取得に失敗しました" }, { status: 500 });
  }
}
