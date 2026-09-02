import { NextRequest, NextResponse } from "next/server";
import { createJournalEntry } from "@/lib/notion";
import { getSupabaseAdmin, PlayerRow } from "@/lib/supabase";
import { BODY_PART_TAGS, JournalSubmission, MENU_TYPES } from "@/lib/types";

function isValidSubmission(body: unknown): body is JournalSubmission {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.playerId === "string" &&
    typeof b.playerName === "string" &&
    typeof b.date === "string" &&
    MENU_TYPES.includes(b.menuType as never) &&
    typeof b.rpe === "number" &&
    b.rpe >= 1 &&
    b.rpe <= 10 &&
    Array.isArray(b.bodyParts) &&
    (b.bodyParts as unknown[]).every((tag) => BODY_PART_TAGS.includes(tag as never)) &&
    typeof b.notes === "string"
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!isValidSubmission(body)) {
    return NextResponse.json({ error: "invalid submission" }, { status: 400 });
  }

  const { data: player } = await getSupabaseAdmin()
    .from("players")
    .select("notion_member_page_id")
    .eq("id", body.playerId)
    .maybeSingle<Pick<PlayerRow, "notion_member_page_id">>();

  try {
    const page = await createJournalEntry(body, player?.notion_member_page_id ?? null);
    return NextResponse.json({ ok: true, notionPageId: page.id });
  } catch (err) {
    console.error("Failed to create Notion journal entry", err);
    return NextResponse.json({ error: "Notionへの保存に失敗しました" }, { status: 502 });
  }
}
