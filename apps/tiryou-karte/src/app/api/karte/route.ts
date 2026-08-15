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
      chiefComplaint,
      needleTreatment,
      needleLocation,
      treatmentScope,
      overallAssessment,
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
      chiefComplaint: chiefComplaint ?? "",
      needleTreatment: needleTreatment ?? "",
      needleLocation: needleTreatment === "あり" ? (needleLocation ?? "") : "",
      treatmentScope: treatmentScope ?? "",
      overallAssessment: overallAssessment ?? "",
      treatmentDate: treatmentDate || new Date().toISOString().slice(0, 10),
    });

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error("Notion POST error:", err);
    return NextResponse.json({ error: "カルテの保存に失敗しました" }, { status: 500 });
  }
}
