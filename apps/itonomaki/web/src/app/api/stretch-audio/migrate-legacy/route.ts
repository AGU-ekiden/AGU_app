import { NextResponse } from "next/server";
import { uploadSharedRecordingsBatch, listSharedRecordings, type BatchUploadItem } from "@/lib/ftpAudio";

// One-time migration: copies every recording still sitting on the old
// Xserver host (acc-pg.com) into the new Lolipop host, via ftpAudio.ts's
// current upload path. No Xserver credentials are needed — the old files
// are served as plain public HTTPS, same as any other library-images asset.
//
// Safe to re-run: uploadSharedRecordingsBatch() overwrites by the same
// (category, setName, text) triple, so a partial failure can just be
// retried. Delete this route once the migration is confirmed done — it has
// no reason to exist afterward, and keeps calling out to a host we're in
// the process of leaving.
const LEGACY_BASE_URL = "https://acc-pg.com/library-images/stretch-audio";

// Fetching the legacy files one-at-a-time (then uploading over a fresh FTP
// connection each time) was slow enough to hit the function's time limit
// with 50+ recordings. Fetches now run concurrently; uploads still go over
// one shared FTP connection (uploadSharedRecordingsBatch), since FTP itself
// doesn't parallelize safely over a single connection. Even so, Lolipop's
// FTPS handshake per file is slow enough that all 50+ in one call can still
// time out, so each call also (a) skips entries already present on the new
// host, so repeated calls make forward progress, and (b) only attempts up
// to `limit` new entries (query param, default 15) — call this endpoint
// repeatedly until migratedCount stops growing.
const FETCH_CONCURRENCY = 8;
const DEFAULT_LIMIT = 15;

export const maxDuration = 60;

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

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
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

  const already = await listSharedRecordings();
  const alreadyKeys = new Set(already.map((r) => `${r.category}/${r.setName}/${r.text}`));
  const remaining = manifest.filter((e) => !alreadyKeys.has(`${e.category}/${e.setName}/${e.text}`));

  const limitParam = Number(new URL(request.url).searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : DEFAULT_LIMIT;
  const toProcess = remaining.slice(0, limit);

  const fetchResults = await mapWithConcurrency(toProcess, FETCH_CONCURRENCY, async (entry) => {
    try {
      const fileRes = await fetch(`${LEGACY_BASE_URL}/${entry.filename}`, { cache: "no-store" });
      if (!fileRes.ok) throw new Error(`ファイル取得失敗(status: ${fileRes.status})`);
      const buffer = Buffer.from(await fileRes.arrayBuffer());
      return { entry, buffer, error: null as string | null };
    } catch (err) {
      return { entry, buffer: null, error: err instanceof Error ? err.message : String(err) };
    }
  });

  const failed: { entry: LegacyManifestEntry; error: string }[] = [];
  const toUpload: BatchUploadItem[] = [];
  for (const r of fetchResults) {
    if (r.error || !r.buffer) {
      failed.push({ entry: r.entry, error: r.error ?? "unknown fetch error" });
    } else {
      toUpload.push({
        buffer: r.buffer,
        category: r.entry.category,
        setName: r.entry.setName,
        text: r.entry.text,
        mimeType: mimeTypeForExtension(r.entry.filename),
      });
    }
  }

  const uploadResults = toUpload.length > 0 ? await uploadSharedRecordingsBatch(toUpload) : [];
  const migrated = uploadResults.filter((r) => r.ok).map((r) => r.key);
  for (const r of uploadResults) {
    if (!r.ok) {
      const entry = manifest.find((e) => `${e.category}/${e.setName}/${e.text}` === r.key);
      if (entry) failed.push({ entry, error: r.error ?? "unknown upload error" });
    }
  }

  return NextResponse.json({
    totalInLegacyManifest: manifest.length,
    alreadyOnNewHostCount: alreadyKeys.size,
    attemptedThisCall: toProcess.length,
    stillRemainingAfterThisCall: remaining.length - toProcess.length,
    migratedCount: migrated.length,
    migrated,
    failedCount: failed.length,
    failed,
  });
}
