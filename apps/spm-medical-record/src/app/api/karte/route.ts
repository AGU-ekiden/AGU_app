import { NextRequest, NextResponse } from "next/server";
import { createKarteRecord, getKartesByPlayer } from "@/lib/notion";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "playerId は必須です" }, { status: 400 });
  }

  try {
    const records = await getKartesByPlayer(playerId);
    return NextResponse.json(records);
  } catch (err) {
    console.error("Notion GET error:", err);
    return NextResponse.json({ error: "カルテの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      playerId,
      clientName,
      trainerName,
      location,
      chiefComplaint,
      physicalCheck,
      procedureContent,
      trainingContent,
      memo,
      tags,
      mediaUrls,
      treatmentDate,
    } = body;

    if (!playerId?.trim() || !clientName?.trim() || !trainerName?.trim()) {
      return NextResponse.json(
        { error: "選手ID・選手名・担当トレーナー名は必須です" },
        { status: 400 }
      );
    }

    const record = await createKarteRecord({
      playerId,
      clientName,
      trainerName,
      location: location ?? "",
      chiefComplaint: chiefComplaint ?? "",
      physicalCheck: physicalCheck ?? "",
      procedureContent: procedureContent ?? "",
      trainingContent: trainingContent ?? "",
      memo: memo ?? "",
      tags: Array.isArray(tags) ? tags : [],
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      // 未指定なら今日の日付で作成する(従来の記録日時と同じ挙動)
      treatmentDate: treatmentDate || new Date().toISOString().slice(0, 10),
    });

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error("Notion POST error:", err);
    return NextResponse.json({ error: "カルテの保存に失敗しました" }, { status: 500 });
  }
}
