import type { NextConfig } from "next";

// ゲートウェイWorker経由で /itonomaki プレフィックス配下に配信するため、
// Next.js自身にプレフィックスを教える(アセット・next/link・useRouterは
// これで自動的にプレフィックス付きになる。fetch("/api/...")などの
// 手書きの絶対パスは lib/api-path.ts の apiPath() で個別に付与している)
const BASE_PATH = "/itonomaki";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
  experimental: {
    // Basic Auth proxy.ts buffers every request body (10MB default) to be
    // able to read it; without raising this, a large phone photo posted to
    // /api/edit/upload-image would be silently truncated rather than erroring.
    proxyClientMaxBodySize: "25mb",
  },
};

export default nextConfig;
