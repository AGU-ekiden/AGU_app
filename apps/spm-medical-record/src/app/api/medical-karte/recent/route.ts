import { NextResponse } from "next/server";
import { getRecentMedicalKartes } from "@/lib/notion";

export async function GET() {
  try {
    const records = await getRecentMedicalKartes(6);
    return NextResponse.json(records);
  } catch (err) {
    console.error("Recent medical karte error:", err);
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }
}
