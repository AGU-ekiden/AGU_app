// Cloudflare向けビルド設定。詳細: https://opennext.js.org/cloudflare
//
// incrementalCache/tagCache は "dummy"(キャッシュしない)にしている。理由は
// apps/tiryou-karte/open-next.config.ts のコメント参照。
//
// 注意: このアプリの写真アップロード機能(@vercel/blob)はVercel専用のため、
// Cloudflareでは動作しない。ビルドは通るが、アップロードAPIを呼ぶと失敗する。
// Cloudflare R2への置き換えは別タスクで対応する。
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  incrementalCache: "dummy",
  tagCache: "dummy",
});
