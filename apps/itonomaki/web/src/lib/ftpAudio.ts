// Stores the stopwatch app's team-shared cue voice recordings on the
// trainer's Lolipop hosting via FTP (migrated from Xserver) — same
// account/credentials as ftpImages.ts, but under its own stretch-audio/
// subdirectory so the two don't mix.
//
// The FTP login's home directory is NOT the same as aogaku-tf.com's public
// document root — on Lolipop, a custom domain is mapped to one specific
// subfolder (configured under サーバーの管理・設定 → 独自ドメイン設定 →
// 公開(アップロード)フォルダ), which for aogaku-tf.com is "aogaku". Anything
// written outside that folder is invisible to the public site, so every
// remote path here is rooted under REMOTE_DIR ("aogaku/stretch-audio"),
// not just AUDIO_DIR.
//
// Filenames are a hash of (category, set, cue text), never the Japanese
// text itself — this was originally worked around a Xserver-specific 404 on
// percent-encoded non-ASCII filenames, but the ASCII-hash approach is safe
// and host-agnostic, so it's kept as-is after the move to Lolipop. A
// manifest.json file (also in stretch-audio/) is the single source of
// truth mapping each hash back to its (category, set, text); listing reads
// that file instead of listing/decoding directory contents.
//
// The stopwatch app has two independent timers that each read cues aloud —
// ストレッチ (stretch) and 補強 (reinforce) — and their recordings must not
// mix (a coach's "反対" for stretch is a different recording from their
// "反対" for reinforce, even though the two are the same word). Recordings
// are further grouped into named "sets" (e.g. a coach's own full set of cue
// readings) so a team can keep several complete recordings side by side and
// pick which one to actually play back. Every recording therefore belongs
// to a (category, set, cue text) triple, which is what's hashed into its
// filename and what the manifest records per entry.
import { Client } from "basic-ftp";
import { PassThrough, Readable } from "node:stream";
import { createHash } from "node:crypto";

const AUDIO_DIR = "stretch-audio";
// Kept parallel to (not nested under) library-images/ — ftpImages.ts's
// photo library — per how the two are meant to sit side by side under
// aogaku-tf.com's public folder.
const REMOTE_DIR = `aogaku/${AUDIO_DIR}`;
const PUBLIC_BASE_URL = `https://aogaku-tf.com/${AUDIO_DIR}`;
const MANIFEST_FILENAME = "manifest.json";

// Must match the stopwatch app's own DEFAULT_SET_NAME constant exactly —
// it's how recordings made before the "sets" feature existed (all
// necessarily category "stretch") are still labeled.
export const DEFAULT_SET_NAME = "デフォルト(これまでの録音)";

function envOrThrow(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const host = envOrThrow("FTP_HOST");
  const user = envOrThrow("FTP_USER");
  const password = envOrThrow("FTP_PASSWORD");

  const client = new Client(15_000);
  try {
    await client.access({ host, user, password, secure: true });
    return await fn(client);
  } finally {
    client.close();
  }
}

function extensionForMimeType(mimeType: string): string {
  const type = mimeType.split(";")[0].trim().toLowerCase();
  if (type === "audio/ogg") return "ogg";
  if (type === "audio/mp4" || type === "audio/x-m4a" || type === "audio/aac") return "m4a";
  if (type === "audio/wav" || type === "audio/x-wav") return "wav";
  return "webm"; // covers audio/webm and anything unrecognized (MediaRecorder's most common default)
}

// Pure hex digest — always plain ASCII, never needs percent-encoding.
function hashKey(category: string, setName: string, text: string): string {
  return createHash("sha256").update(`${category}:${setName}:${text}`).digest("hex").slice(0, 24);
}

interface ManifestEntry {
  category: string;
  setName: string;
  text: string;
  filename: string;
}

async function readManifest(client: Client): Promise<ManifestEntry[]> {
  const chunks: Buffer[] = [];
  const stream = new PassThrough();
  stream.on("data", (chunk: Buffer) => chunks.push(chunk));
  try {
    await client.downloadTo(stream, MANIFEST_FILENAME);
  } catch {
    return []; // doesn't exist yet — nobody has uploaded anything
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeManifest(client: Client, entries: ManifestEntry[]): Promise<void> {
  await client.uploadFrom(Readable.from(Buffer.from(JSON.stringify(entries), "utf-8")), MANIFEST_FILENAME);
}

// Default Apache mime.types on shared hosting commonly has no mapping for
// .m4a/.webm/.ogg (confirmed on the previous Xserver host; kept here as a
// defensive no-op after the move to Lolipop, since it's harmless either
// way). An .htaccess with explicit AddType directives fixes it.
//
// Also disables directory listing and asks crawlers not to index this
// folder — filenames are unguessable hashes and nothing links to them, but
// this is cheap defense-in-depth against the recordings turning up in
// search results. mod_headers is wrapped in <IfModule> so this stays a
// no-op (rather than a 500) if that module isn't enabled on the host.
const HTACCESS_CONTENT =
  "AddType audio/mp4 .m4a\nAddType audio/webm .webm\nAddType audio/ogg .ogg\nAddType audio/wav .wav\nOptions -Indexes\n<IfModule mod_headers.c>\nHeader set X-Robots-Tag \"noindex, nofollow\"\n</IfModule>\n";

async function ensureAudioDir(client: Client): Promise<void> {
  await client.ensureDir(REMOTE_DIR); // creates it if missing and cds into it
  await client.sendIgnoringError("SITE CHMOD 755 .");
  await client.uploadFrom(Readable.from(Buffer.from(HTACCESS_CONTENT, "utf-8")), ".htaccess").catch(() => {});
}

export interface SharedRecording {
  category: string;
  setName: string;
  text: string;
  url: string;
}

/** Lists every cue currently shared on the server, across every category and
 *  set. An empty list (not an error) just means nobody has uploaded anything
 *  yet. */
export async function listSharedRecordings(): Promise<SharedRecording[]> {
  return withClient(async (client) => {
    await client.ensureDir(REMOTE_DIR);
    const manifest = await readManifest(client);
    return manifest.map((e) => ({
      category: e.category,
      setName: e.setName,
      text: e.text,
      url: `${PUBLIC_BASE_URL}/${e.filename}`,
    }));
  });
}

/** Uploads a recording for the given (category, set, cue text) triple,
 *  replacing any existing recording(s) for that same exact triple (even ones
 *  saved under a different audio format/filename previously). Returns the
 *  new public URL. Throws if the upload doesn't actually verify on the
 *  server afterward, instead of reporting a false success. */
export async function uploadSharedRecording(buffer: Buffer, category: string, setName: string, text: string, mimeType: string): Promise<string> {
  const filename = `${hashKey(category, setName, text)}.${extensionForMimeType(mimeType)}`;

  return withClient(async (client) => {
    await ensureAudioDir(client);

    const manifest = await readManifest(client);
    const existing = manifest.find((e) => e.category === category && e.setName === setName && e.text === text);
    if (existing && existing.filename !== filename) {
      await client.remove(existing.filename).catch(() => {});
    }

    await client.uploadFrom(Readable.from(buffer), filename);
    await client.sendIgnoringError(`SITE CHMOD 644 ${filename}`);

    // Confirm the file actually landed with the right size before reporting
    // success — a silent write failure previously left "チーム共有済み"
    // (and a URL) pointing at a file that 404s.
    const remoteSize = await client.size(filename);
    if (remoteSize !== buffer.length) {
      throw new Error(`アップロード後の確認に失敗しました(サーバー上のサイズ ${remoteSize} バイト、期待値 ${buffer.length} バイト)`);
    }

    const nextManifest = manifest.filter((e) => !(e.category === category && e.setName === setName && e.text === text));
    nextManifest.push({ category, setName, text, filename });
    await writeManifest(client, nextManifest);

    return `${PUBLIC_BASE_URL}/${filename}`;
  });
}

export interface BatchUploadItem {
  buffer: Buffer;
  category: string;
  setName: string;
  text: string;
  mimeType: string;
}

export interface BatchUploadResult {
  key: string;
  ok: boolean;
  url?: string;
  error?: string;
}

/** Same behavior as calling uploadSharedRecording() once per item, but over
 *  a single FTP connection and a single manifest read/write — used by the
 *  legacy-host migration, where reconnecting per item (dozens of times)
 *  was slow enough to hit the serverless function's time limit. */
export async function uploadSharedRecordingsBatch(items: BatchUploadItem[]): Promise<BatchUploadResult[]> {
  return withClient(async (client) => {
    await ensureAudioDir(client);
    const manifest = await readManifest(client);
    const results: BatchUploadResult[] = [];

    for (const item of items) {
      const key = `${item.category}/${item.setName}/${item.text}`;
      try {
        const filename = `${hashKey(item.category, item.setName, item.text)}.${extensionForMimeType(item.mimeType)}`;
        const existingIdx = manifest.findIndex((e) => e.category === item.category && e.setName === item.setName && e.text === item.text);
        if (existingIdx >= 0 && manifest[existingIdx].filename !== filename) {
          await client.remove(manifest[existingIdx].filename).catch(() => {});
        }

        await client.uploadFrom(Readable.from(item.buffer), filename);
        await client.sendIgnoringError(`SITE CHMOD 644 ${filename}`);

        const remoteSize = await client.size(filename);
        if (remoteSize !== item.buffer.length) {
          throw new Error(`アップロード後の確認に失敗しました(サーバー上のサイズ ${remoteSize} バイト、期待値 ${item.buffer.length} バイト)`);
        }

        const entry = { category: item.category, setName: item.setName, text: item.text, filename };
        if (existingIdx >= 0) manifest[existingIdx] = entry;
        else manifest.push(entry);

        results.push({ key, ok: true, url: `${PUBLIC_BASE_URL}/${filename}` });
      } catch (err) {
        results.push({ key, ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    }

    await writeManifest(client, manifest);
    return results;
  });
}

/** Deletes whatever recording matches the given (category, set, cue text)
 *  triple. */
export async function deleteSharedRecording(category: string, setName: string, text: string): Promise<void> {
  await withClient(async (client) => {
    await client.ensureDir(REMOTE_DIR);
    const manifest = await readManifest(client);
    const entry = manifest.find((e) => e.category === category && e.setName === setName && e.text === text);
    if (!entry) return;
    await client.remove(entry.filename).catch(() => {});
    await writeManifest(
      client,
      manifest.filter((e) => e !== entry)
    );
  });
}

/** Deletes every recording belonging to the given (category, set). */
export async function deleteSharedSet(category: string, setName: string): Promise<void> {
  await withClient(async (client) => {
    await client.ensureDir(REMOTE_DIR);
    const manifest = await readManifest(client);
    const toRemove = manifest.filter((e) => e.category === category && e.setName === setName);
    for (const entry of toRemove) {
      await client.remove(entry.filename).catch(() => {});
    }
    await writeManifest(
      client,
      manifest.filter((e) => !(e.category === category && e.setName === setName))
    );
  });
}
