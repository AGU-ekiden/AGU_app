import { NextResponse } from "next/server";
import { readRoster, writeRoster } from "@/lib/ftpRoster";

// Called cross-origin from the stopwatch app's 点呼(ロールコール)タブ, same
// as /api/stretch-audio. Unlike stretch-audio, roster edits need no password
// — anyone with access to the stopwatch app can edit/share the roster.
// CORS is left wide open: both GET and POST are public.
const MAX_UPLOAD_BYTES = 512 * 1024; // 名簿のJSONはこれで十分すぎるほど大きい

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: { ...corsHeaders(), ...init?.headers } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET() {
  try {
    const data = await readRoster();
    return json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const bodyText = await request.text();
  if (bodyText.length > MAX_UPLOAD_BYTES) {
    return json({ error: "データサイズが大きすぎます" }, { status: 400 });
  }
  let data: unknown;
  try {
    data = JSON.parse(bodyText);
  } catch {
    return json({ error: "JSONの形式が不正です" }, { status: 400 });
  }

  try {
    await writeRoster(data);
    return json({ ok: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
