// ルートのvercel.jsonのrewrites経由で /training-result プレフィックス配下に
// 配信されるため、fetch("/api/...")のような手書きの絶対パスにはこれで
// basePathを付与する。next/link・useRouter・next/imageはNext.js側が
// 自動でbasePathを付けるため対象外。
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function apiPath(path: string): string {
  return `${BASE_PATH}${path}`;
}
