import "server-only";
import { getDropboxClient, getResultsFolderPath } from "@/lib/dropbox";
import type { PracticeResult, PracticeStatus, PracticeTeam } from "@/lib/types";

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

/** パス中の「男子」「女子」フォルダ名から所属を判定する。それ以外は合宿フォルダとして扱う */
function inferTeam(path: string): PracticeTeam {
  if (path.includes("男子")) return "male";
  if (path.includes("女子")) return "female";
  return "camp";
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

function toPracticeResult(entry: DropboxFileEntry): PracticeResult | null {
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
  };
}

/**
 * Dropbox内の対象フォルダにあるPDFファイルを、Dropbox APIのページ単位で
 * 逐次yieldする。一覧取得は複数ページ(filesListFolderContinue)に渡ることが
 * あり、全ページを待たずに先に届いた分から画面表示できるようにするための
 * ストリーミング版。
 */
export async function* iteratePracticeResultBatches(): AsyncGenerator<
  PracticeResult[]
> {
  const dbx = getDropboxClient();
  const folderPath = getResultsFolderPath();

  let response = await dbx.filesListFolder({
    path: folderPath,
    recursive: true,
  });

  for (;;) {
    const batch = response.result.entries
      .map((entry) => toPracticeResult(entry as DropboxFileEntry))
      .filter((r): r is PracticeResult => r !== null);
    if (batch.length > 0) yield batch;

    if (!response.result.has_more) break;
    response = await dbx.filesListFolderContinue({
      cursor: response.result.cursor,
    });
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
    return toPracticeResult(response.result as DropboxFileEntry);
  } catch {
    return null;
  }
}

/**
 * idから安全なDropboxパスを復元する。
 * 対象フォルダ配下のPDFでなければnullを返す（パストラバーサル対策）。
 */
export async function resolveResultPath(id: string): Promise<string | null> {
  const path = decodeResultId(id);
  if (!path) return null;
  if (!path.toLowerCase().endsWith(".pdf")) return null;

  const folderPath = getResultsFolderPath().toLowerCase();
  if (folderPath && !path.toLowerCase().startsWith(folderPath)) return null;

  return path;
}
