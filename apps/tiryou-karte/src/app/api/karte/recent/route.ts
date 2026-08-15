import { NextResponse } from "next/server";
import { getRecentKartes } from "@/lib/notion";

export async function GET() {
  try {
    const records = await getRecentKartes(6);
    return NextResponse.json(records);
  } catch (err) {
    console.error("Recent karte error:", err);
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }
}
