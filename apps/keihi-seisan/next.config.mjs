// vercel.jsonのrewrites経由で /keihi-seisan プレフィックス配下に配信するため、
// Next.js自身にプレフィックスを教える(アセット・next/link・useRouterは
// これで自動的にプレフィックス付きになる)。
const BASE_PATH = "/keihi-seisan";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
  // ポータル側(vercel.json)はtrailingSlash:trueで末尾スラッシュを付与する方向、
  // Next.jsのデフォルトはその逆(削除する方向)のため、何もしないと両者が
  // リダイレクトし合って無限ループになる。Next.js側の自動リダイレクトを止める。
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
