import "server-only";
import {
  getDropboxClient,
  getMatchResultsFolderPath,
  getResultsFolderPath,
} from "@/lib/dropbox";
import type {
  PracticeResult,
  PracticeStatus,
  PracticeTag,
  PracticeTeam,
} from "@/lib/types";

// ファイル名中のトークンとステータスの対応表。
// 例: "2026-09-01_合格_柔道乱取り.pdf" -> 日付・ステータス・タイトルを抽出
const STATUS_KEYWORDS: Record<string, PracticeStatus> = {
  合格: "pass",
  通過: "pass",
  成功: "pass",
  ok: "pass",
  pass: "pass",
  不合格: "fail",
  失敗: "fail",
  ng: "fail",
  fail: "fail",
};

const DATE_TOKEN = /^\d{4}-\d{2}-\d{2}$/;

/** パス中の「男子」「女子」「合宿」フォルダ名から所属を判定する。
 *  いずれにも一致しなければ "other"（バッジ非表示）とする。 */
function inferTeam(path: string): PracticeTeam {
  if (path.includes("男子")) return "male";
  if (path.includes("女子")) return "female";
  if (path.includes("合宿")) return "camp";
  return "other";
}

function encodeResultId(path: string): string {
  return Buffer.from(path, "utf-8").toString("base64url");
}

function decodeResultId(id: string): string | null {
  try {
    const decoded = Buffer.from(id, "base64url").toString("utf-8");
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

function parseNameMeta(filename: string): {
  practiceDate: string | null;
  status: PracticeStatus;
  title: string;
} {
  const base = filename.replace(/\.pdf$/i, "");
  const tokens = base.split(/[_\s]+/).filter(Boolean);

  let practiceDate: string | null = null;
  let status: PracticeStatus = "unclassified";
  const titleTokens: string[] = [];

  for (const token of tokens) {
    if (!practiceDate && DATE_TOKEN.test(token)) {
      practiceDate = token;
      continue;
    }
    if (status === "unclassified" && STATUS_KEYWORDS[token.toLowerCase()]) {
      status = STATUS_KEYWORDS[token.toLowerCase()];
      continue;
    }
    titleTokens.push(token);
  }

  return {
    practiceDate,
    status,
    title: titleTokens.length > 0 ? titleTokens.join(" ") : base,
  };
}

// dropbox SDKの型を直接importせず、使う分だけ緩く受け取る
// (filesListFolder/filesGetMetadataの結果エントリはどちらもこの形)
interface DropboxFileEntry {
  [".tag"]: string;
  name: string;
  path_display?: string;
  path_lower?: string;
  size: number;
  client_modified?: string;
  server_modified: string;
}

function toPracticeResult(
  entry: DropboxFileEntry,
  tag: PracticeTag
): PracticeResult | null {
  if (entry[".tag"] !== "file") return null;
  if (!entry.name.toLowerCase().endsWith(".pdf")) return null;
  // ZIP展開時にmacOSが作る "._foo.pdf" のようなリソースフォークファイルは除外
  if (entry.name.startsWith("._")) return null;

  const path = entry.path_display ?? entry.path_lower ?? entry.name;
  const meta = parseNameMeta(entry.name);
  const modifiedAt = entry.client_modified ?? entry.server_modified;

  return {
    id: encodeResultId(path),
    name: entry.name,
    title: meta.title,
    path,
    size: entry.size,
    modifiedAt,
    practiceDate: meta.practiceDate ?? modifiedAt.slice(0, 10),
    status: meta.status,
    team: inferTeam(path),
    tag,
  };
}

/** 指定パスが試合結果フォルダ配下かどうかで、付与すべきタグを判定する */
function tagForPath(path: string): PracticeTag {
  const matchFolder = getMatchResultsFolderPath();
  if (matchFolder && path.toLowerCase().startsWith(matchFolder.toLowerCase())) {
    return "match_tt";
  }
  return "practice";
}

/** 指定フォルダ配下のPDFファイルを、Dropbox APIのページ単位で逐次yieldする */
async function* iterateFolderBatches(
  folderPath: string,
  tag: PracticeTag
): AsyncGenerator<PracticeResult[]> {
  const dbx = getDropboxClient();

  let response = await dbx.filesListFolder({
    path: folderPath,
    recursive: true,
  });

  for (;;) {
    const batch = response.result.entries
      .map((entry) => toPracticeResult(entry as DropboxFileEntry, tag))
      .filter((r): r is PracticeResult => r !== null);
    if (batch.length > 0) yield batch;

    if (!response.result.has_more) break;
    response = await dbx.filesListFolderContinue({
      cursor: response.result.cursor,
    });
  }
}

/**
 * 練習結果フォルダ（タグ: 練習）に加え、試合結果フォルダ
 * （DROPBOX_MATCH_FOLDER_PATH設定時のみ、タグ: 試合・TT固定）にある
 * PDFファイルも、Dropbox APIのページ単位で逐次yieldする。
 * 一覧取得は複数ページ(filesListFolderContinue)に渡ることがあり、
 * 全ページを待たずに先に届いた分から画面表示できるようにするための
 * ストリーミング版。
 */
export async function* iteratePracticeResultBatches(): AsyncGenerator<
  PracticeResult[]
> {
  yield* iterateFolderBatches(getResultsFolderPath(), "practice");

  const matchFolder = getMatchResultsFolderPath();
  if (matchFolder !== null) {
    yield* iterateFolderBatches(matchFolder, "match_tt");
  }
}

/** Dropbox内の対象フォルダにあるPDFファイルを一覧取得する */
export async function listPracticeResults(): Promise<PracticeResult[]> {
  const results: PracticeResult[] = [];
  for await (const batch of iteratePracticeResultBatches()) {
    results.push(...batch);
  }
  return results;
}

/**
 * 指定パス1件分のメタデータだけをDropboxから取得する。詳細画面用
 * (フォルダ全体を再帰一覧するより大幅に速い)。
 */
export async function getPracticeResultByPath(
  path: string
): Promise<PracticeResult | null> {
  const dbx = getDropboxClient();
  try {
    const response = await dbx.filesGetMetadata({ path });
    return toPracticeResult(response.result as DropboxFileEntry, tagForPath(path));
  } catch {
    return null;
  }
}

/**
 * idから安全なDropboxパスを復元する。
 * 対象フォルダ（練習結果 or 試合結果）配下のPDFでなければnullを返す
 * （パストラバーサル対策）。
 */
export async function resolveResultPath(id: string): Promise<string | null> {
  const path = decodeResultId(id);
  if (!path) return null;
  if (!path.toLowerCase().endsWith(".pdf")) return null;

  const lowerPath = path.toLowerCase();
  const practiceFolder = getResultsFolderPath().toLowerCase();
  const matchFolder = getMatchResultsFolderPath()?.toLowerCase() ?? null;

  const underPractice = !practiceFolder || lowerPath.startsWith(practiceFolder);
  const underMatch = matchFolder !== null && lowerPath.startsWith(matchFolder);
  if (!underPractice && !underMatch) return null;

  return path;
}
