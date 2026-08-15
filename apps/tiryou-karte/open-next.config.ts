// Cloudflare向けビルド設定。詳細: https://opennext.js.org/cloudflare
//
// incrementalCache/tagCache は "dummy"(キャッシュしない)にしている。
// このアプリはNotionからの動的取得が中心でISR/静的再生成に強く依存しないため、
// 今はR2バケットを用意せずに動かすことを優先した。将来キャッシュを有効化する
// 場合は https://opennext.js.org/cloudflare/caching を参照し、R2バケットを
// wrangler.jsonc に追加した上で r2-incremental-cache に切り替える。
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  incrementalCache: "dummy",
  tagCache: "dummy",
});
