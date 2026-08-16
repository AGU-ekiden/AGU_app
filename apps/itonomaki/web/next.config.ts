import type { NextConfig } from "next";

// vercel.jsonのrewrites経由で /itonomaki プレフィックス配下に配信するため、
// Next.js自身にプレフィックスを教える(アセット・next/link・useRouterは
// これで自動的にプレフィックス付きになる。fetch("/api/...")などの
// 手書きの絶対パスは lib/api-path.ts の apiPath() で個別に付与している)
const BASE_PATH = "/itonomaki";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
  // ポータル側(vercel.json)はtrailingSlash:trueで末尾スラッシュを付与する方向、
  // Next.jsのデフォルトはその逆(削除する方向)のため、何もしないと両者が
  // リダイレクトし合って無限ループになる。Next.js側の自動リダイレクトを止める。
  skipTrailingSlashRedirect: true,
  experimental: {
    // Basic Auth proxy.ts buffers every request body (10MB default) to be
    // able to read it; without raising this, a large phone photo posted to
    // /api/edit/upload-image would be silently truncated rather than erroring.
    proxyClientMaxBodySize: "25mb",
  },
};

export default nextConfig;
