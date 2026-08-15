import { NextResponse } from "next/server";
import { getLocationOptions } from "@/lib/notion";

export async function GET() {
  try {
    const locations = await getLocationOptions();
    return NextResponse.json(locations);
  } catch (err) {
    console.error("Locations GET error:", err);
    return NextResponse.json({ error: "場所一覧の取得に失敗しました" }, { status: 500 });
  }
}
