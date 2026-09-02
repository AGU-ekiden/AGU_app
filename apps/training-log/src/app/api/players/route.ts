import { NextResponse } from "next/server";
import { getSupabaseAdmin, PlayerRow } from "@/lib/supabase";
import { Player } from "@/lib/types";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("players")
    .select("id, name, notion_member_page_id, active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const players: Player[] = (data as PlayerRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    notionMemberPageId: row.notion_member_page_id,
  }));
  return NextResponse.json(players);
}
