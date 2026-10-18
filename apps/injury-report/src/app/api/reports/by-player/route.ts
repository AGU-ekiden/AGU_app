import { NextResponse } from "next/server";
import { getReportsByPlayer } from "@/lib/notion";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");
  if (!playerId) {
    return NextResponse.json({ error: "playerIdが必要です" }, { status: 400 });
  }
  try {
    const reports = await getReportsByPlayer(playerId);
    return NextResponse.json(reports);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
