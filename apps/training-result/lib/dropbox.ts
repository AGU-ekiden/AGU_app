import "server-only";
import { Dropbox } from "dropbox";

let cachedClient: Dropbox | null = null;

function createClient(): Dropbox {
  const clientId = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_APP_SECRET;
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const accessToken = process.env.DROPBOX_ACCESS_TOKEN;

  // 推奨: OAuth2リフレッシュトークン方式（アクセストークンが自動更新される）
  if (clientId && clientSecret && refreshToken) {
    return new Dropbox({ clientId, clientSecret, refreshToken });
  }

  // 暫定: アクセストークンを直接指定する方式（検証・開発用途向け）
  if (accessToken) {
    return new Dropbox({ accessToken });
  }

  throw new Error(
    "Dropboxの認証情報が設定されていません。.env.local を確認してください（DROPBOX_ACCESS_TOKEN、または DROPBOX_APP_KEY / DROPBOX_APP_SECRET / DROPBOX_REFRESH_TOKEN）。"
  );
}

export function getDropboxClient(): Dropbox {
  if (!cachedClient) {
    cachedClient = createClient();
  }
  return cachedClient;
}

export function getResultsFolderPath(): string {
  const raw = process.env.DROPBOX_FOLDER_PATH ?? "";
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
