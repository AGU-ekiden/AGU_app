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
      location: location ?? "",
      chiefComplaint: chiefComplaint ?? "",
      physicalCheck: physicalCheck ?? "",
      procedureContent: procedureContent ?? "",
      trainingContent: trainingContent ?? "",
      memo: memo ?? "",
      tags: Array.isArray(tags) ? tags : [],
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      treatmentDate: treatmentDate || "",
    });

    return NextResponse.json(record);
  } catch (err) {
    console.error("Notion PUT error:", err);
    return NextResponse.json({ error: "カルテの更新に失敗しました" }, { status: 500 });
  }
}
