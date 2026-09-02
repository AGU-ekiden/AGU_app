import { NextRequest, NextResponse } from "next/server";
import { getAuthorizeUrl } from "@/lib/strava";

// state に選手IDをそのまま乗せてStravaの認可画面に渡し、callbackで受け取って
// どの選手のトークンかを紐付ける(内輪向けツールのためCSRF対策の署名は省略)。
export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId");
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }
  return NextResponse.json({ url: getAuthorizeUrl(playerId) });
}
