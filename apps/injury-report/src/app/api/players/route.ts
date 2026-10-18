import { NextResponse } from "next/server";
import { findPlayerByName, getPlayers } from "@/lib/notion";

// ?name=... を渡すと、ポータルのログイン名(localStorageのagu_portal_auth)に
// 対応する部員1人だけを返す(見つからなければ404)。省略時は選手全員を返す
// (トレーナー用ダッシュボードでの参照用)。
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  try {
    if (name) {
      const player = await findPlayerByName(name);
      if (!player) {
        return NextResponse.json({ error: "部員DBに該当する選手が見つかりません" }, { status: 404 });
      }
      return NextResponse.json(player);
    }
    const players = await getPlayers();
    return NextResponse.json(players);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
