// ゲートウェイWorker経由で /spm-medical-record プレフィックス配下に配信されるため、
// fetch("/api/...")のような手書きの絶対パスにはこれでbasePathを付与する。
// next/link・useRouter・next/imageはNext.js側が自動でbasePathを付けるため対象外。
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function apiPath(path: string): string {
  return `${BASE_PATH}${path}`;
}
