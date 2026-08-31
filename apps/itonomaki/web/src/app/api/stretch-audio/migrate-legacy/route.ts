import { NextResponse } from "next/server";
import { uploadSharedRecording } from "@/lib/ftpAudio";

// One-time migration: copies every recording still sitting on the old
// Xserver host (acc-pg.com) into the new Lolipop host, via ftpAudio.ts's
// current upload path. No Xserver credentials are needed — the old files
// are served as plain public HTTPS, same as any other library-images asset.
//
// Safe to re-run: uploadSharedRecording() overwrites by the same
// (category, setName, text) triple, so a partial failure can just be
// retried. Delete this route once the migration is confirmed done — it has
// no reason to exist afterward, and keeps calling out to a host we're in
// the process of leaving.
const LEGACY_BASE_URL = "https://acc-pg.com/library-images/stretch-audio";

interface LegacyManifestEntry {
  category: string;
  setName: string;
  text: string;
  filename: string;
}

function mimeTypeForExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "ogg") return "audio/ogg";
  if (ext === "m4a") return "audio/mp4";
  if (ext === "wav") return "audio/wav";
  return "audio/webm";
}

function requireAudioToken(request: Request): boolean {
  const expected = process.env.STRETCH_AUDIO_TOKEN?.trim();
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  return provided === expected;
}

export async function POST(request: Request) {
  if (!requireAudioToken(request)) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const manifestRes = await fetch(`${LEGACY_BASE_URL}/manifest.json`, { cache: "no-store" }).catch(() => null);
  if (!manifestRes || !manifestRes.ok) {
    return NextResponse.json({ error: `旧サーバーのmanifest.json取得に失敗しました(status: ${manifestRes?.status ?? "network error"})` }, { status: 502 });
  }
  const manifest = (await manifestRes.json().catch(() => null)) as LegacyManifestEntry[] | null;
  if (!Array.isArray(manifest)) {
    return NextResponse.json({ error: "旧サーバーのmanifest.jsonの形式が不正です" }, { status: 502 });
  }

  const migrated: string[] = [];
  const failed: { entry: LegacyManifestEntry; error: string }[] = [];

  for (const entry of manifest) {
    try {
      const fileRes = await fetch(`${LEGACY_BASE_URL}/${entry.filename}`, { cache: "no-store" });
      if (!fileRes.ok) throw new Error(`ファイル取得失敗(status: ${fileRes.status})`);
      const buffer = Buffer.from(await fileRes.arrayBuffer());
      await uploadSharedRecording(buffer, entry.category, entry.setName, entry.text, mimeTypeForExtension(entry.filename));
      migrated.push(`${entry.category}/${entry.setName}/${entry.text}`);
    } catch (err) {
      failed.push({ entry, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    totalInLegacyManifest: manifest.length,
    migratedCount: migrated.length,
    migrated,
    failedCount: failed.length,
    failed,
  });
}
