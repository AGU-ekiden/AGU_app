// Cloudflare向けビルド設定。詳細: https://opennext.js.org/cloudflare
//
// incrementalCache/tagCache は "dummy"(キャッシュしない)にしている。理由は
// apps/tiryou-karte/open-next.config.ts のコメント参照。
//
// 注意: 写真アップロード・音声共有・点呼名簿の各機能はFTP(basic-ftp)経由で
// Xserverと通信しており、Cloudflareでは動作しない。ビルドは通るが、該当APIを
// 呼ぶと失敗する。R2への置き換え、または点呼名簿はNotion部員DB参照への切り替え
// を別タスクで対応する。
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  incrementalCache: "dummy",
  tagCache: "dummy",
});
