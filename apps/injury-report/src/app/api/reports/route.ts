import { NextResponse } from "next/server";
import { createInjuryReport } from "@/lib/notion";
import { InjuryReportFormData } from "@/types/injury";

export async function POST(request: Request) {
  let data: InjuryReportFormData;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONの形式が不正です" }, { status: 400 });
  }

  if (!data.playerId || !data.playerName || !data.reportDate || !data.stage) {
    return NextResponse.json({ error: "必須項目が入力されていません" }, { status: 400 });
  }

  try {
    const record = await createInjuryReport(data);
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
