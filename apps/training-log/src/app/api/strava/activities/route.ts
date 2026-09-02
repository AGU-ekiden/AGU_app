import { NextRequest, NextResponse } from "next/server";
import { fetchRecentRunActivities, getValidAccessToken } from "@/lib/strava";

export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId");
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const accessToken = await getValidAccessToken(playerId);
  if (!accessToken) {
    return NextResponse.json({ connected: false, activities: [] }, { status: 200 });
  }

  try {
    const activities = await fetchRecentRunActivities(accessToken, 5);
    return NextResponse.json({ connected: true, activities });
  } catch (err) {
    console.error("Failed to fetch Strava activities", err);
    return NextResponse.json({ error: "Stravaからのデータ取得に失敗しました" }, { status: 502 });
  }
}
