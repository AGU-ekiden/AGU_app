import type { NextConfig } from "next";

// ゲートウェイWorker経由で /tiryou-karte プレフィックス配下に配信するため、
// Next.js自身にプレフィックスを教える(アセット・next/link・useRouterは
// これで自動的にプレフィックス付きになる。fetch("/api/...")などの
// 手書きの絶対パスは lib/api-path.ts の apiPath() で個別に付与している)
const BASE_PATH = "/tiryou-karte";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
};

export default nextConfig;
