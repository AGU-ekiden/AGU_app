import { NextResponse } from "next/server";
import { getRecentReports } from "@/lib/notion";

export async function GET() {
  try {
    const reports = await getRecentReports();
    return NextResponse.json(reports);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
