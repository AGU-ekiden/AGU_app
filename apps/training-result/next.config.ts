import type { NextConfig } from "next";

// vercel.jsonのrewrites経由で /training-result プレフィックス配下に配信するため、
// Next.js自身にプレフィックスを教える。
const BASE_PATH = "/training-result";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
