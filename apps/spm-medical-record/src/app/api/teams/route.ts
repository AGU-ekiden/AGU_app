import { NextResponse } from "next/server";
import { getTeams } from "@/lib/notion";

export async function GET() {
  try {
    const teams = await getTeams();
    return NextResponse.json(teams);
  } catch (err) {
    console.error("Teams GET error:", err);
    return NextResponse.json({ error: "チームの取得に失敗しました" }, { status: 500 });
  }
}
