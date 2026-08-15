import { NextRequest, NextResponse } from "next/server";
import { getPlayerProfileByPlayer, upsertPlayerProfile } from "@/lib/notion";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "playerId は必須です" }, { status: 400 });
  }

  try {
    const profile = await getPlayerProfileByPlayer(playerId);
    return NextResponse.json(profile);
  } catch (err) {
    console.error("Notion profile GET error:", err);
    return NextResponse.json({ error: "プロフィールの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerId, clientName, existingConditions, medications } = body;

    if (!playerId?.trim() || !clientName?.trim()) {
      return NextResponse.json(
        { error: "選手ID・選手名は必須です" },
        { status: 400 }
      );
    }

    const profile = await upsertPlayerProfile({
      playerId,
      clientName,
      existingConditions: existingConditions ?? "",
      medications: medications ?? "",
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    console.error("Notion profile POST error:", err);
    return NextResponse.json({ error: "プロフィールの保存に失敗しました" }, { status: 500 });
  }
}
