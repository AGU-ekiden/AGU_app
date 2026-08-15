import { NextRequest, NextResponse } from "next/server";
import { updateKarteRecord } from "@/lib/notion";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const {
      clientName,
      trainerName,
      chiefComplaint,
      needleTreatment,
      needleLocation,
      treatmentScope,
      overallAssessment,
      treatmentDate,
    } = body;

    if (!clientName?.trim() || !trainerName?.trim()) {
      return NextResponse.json(
        { error: "選手名・担当トレーナー名は必須です" },
        { status: 400 }
      );
    }

    const record = await updateKarteRecord(id, {
      playerId: body.playerId ?? "",
      clientName,
      trainerName,
      chiefComplaint: chiefComplaint ?? "",
      needleTreatment: needleTreatment ?? "",
      needleLocation: needleTreatment === "あり" ? (needleLocation ?? "") : "",
      treatmentScope: treatmentScope ?? "",
      overallAssessment: overallAssessment ?? "",
      treatmentDate: treatmentDate || "",
    });

    return NextResponse.json(record);
  } catch (err) {
    console.error("Notion PUT error:", err);
    return NextResponse.json({ error: "カルテの更新に失敗しました" }, { status: 500 });
  }
}
