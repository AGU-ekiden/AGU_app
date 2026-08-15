import { NextResponse } from "next/server";
import { getTrainerOptions } from "@/lib/notion";

export async function GET() {
  try {
    const trainers = await getTrainerOptions();
    return NextResponse.json(trainers);
  } catch (err) {
    console.error("Trainers GET error:", err);
    return NextResponse.json({ error: "トレーナー一覧の取得に失敗しました" }, { status: 500 });
  }
}
