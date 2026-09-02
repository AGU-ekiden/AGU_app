import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeAndSaveToken } from "@/lib/strava";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const playerId = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`${BASE_PATH}/?strava=denied`, request.url));
  }
  if (!code || !playerId) {
    return NextResponse.redirect(new URL(`${BASE_PATH}/?strava=error`, request.url));
  }

  try {
    await exchangeCodeAndSaveToken(playerId, code);
  } catch (err) {
    console.error("Strava token exchange failed", err);
    return NextResponse.redirect(new URL(`${BASE_PATH}/?strava=error`, request.url));
  }

  return NextResponse.redirect(
    new URL(`${BASE_PATH}/?strava=connected&playerId=${playerId}`, request.url)
  );
}
