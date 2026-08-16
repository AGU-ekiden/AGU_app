# デプロイセットアップスクリプト(Cloudflare)

このリポジトリは **Cloudflare** に統一してデプロイする方針です。アプリの種類によって2つの経路に分かれます。

| 種類 | 対象アプリ | デプロイ先 | 使うスクリプト |
| --- | --- | --- | --- |
| 静的サイト・Viteアプリ | tokei, stopwatch, taskkyoyu, task, meal_traker, ryouhi, label_create, ポータル本体 | **Cloudflare Pages** | `setup_cloudflare.py` |
| Next.js(SSR/API Routes) | tiryou-karte, spm-medical-record, itonomaki | **Cloudflare Workers**(`@opennextjs/cloudflare`) | 各アプリで `npm run cf:deploy` |

(旧 `setup_vercel.py` / `vercel-apps.json` はVercel運用時の名残として残していますが、現在の方針では使いません)

---

## A. 静的サイト・Viteアプリ(Cloudflare Pages)

### 事前準備

1. **APIトークンを発行する**
   Cloudflareダッシュボード → My Profile → API Tokens → 「Create Token」→
   「Account」→「Cloudflare Pages」に「Edit」権限を付与して作成
2. **Account IDを確認する**
   ダッシュボードのどのドメイン(サイト)の概要ページでも、右サイドバーに
   `Account ID` が表示されている
3. **GitHub連携を1回済ませておく**
   Cloudflareダッシュボード → Workers & Pages → Create → Pages →
   「Connect to Git」でこのリポジトリ(`AGU-ekiden/AGU_app`)を選んで、手動で
   プロジェクトを1つ作成するとGitHub Appの権限が設定される。以降はスクリプト
   からの自動作成も通るようになる
4. **秘密の環境変数を用意する**(Vercelスクリプトと共用)
   ```bash
   cp .env.vercel.local.example .env.vercel.local
   # .env.vercel.local を実際の値で埋める(このファイルはコミットされない)
   ```

### 実行

```bash
export CLOUDFLARE_API_TOKEN=xxxxxxxxxxxxxxxx
export CLOUDFLARE_ACCOUNT_ID=xxxxxxxxxxxxxxxx

# まずは --dry-run で内容を確認(実際のAPI呼び出しはしない)
python3 scripts/setup_cloudflare.py --dry-run

# 問題なければ実行
python3 scripts/setup_cloudflare.py

# 一部のアプリだけ実行したい場合
python3 scripts/setup_cloudflare.py --only ryouhi,label_create
```

### スクリプトがやること

各アプリについて、同名のPagesプロジェクトが無ければこのリポジトリと連携した
状態で新規作成し、Root Directory・Build Command・Output Directoryを設定、
`.env.vercel.local` に値があるキーだけ環境変数として登録します。**上書きは
しません**(既に同名の環境変数があればスキップ)。

### 実行後にやること

- 各プロジェクトのデプロイが成功したら、リポジトリルートの `apps-data.js` の
  該当アプリの `liveUrl` を実際のURL(`https://<プロジェクト名>.pages.dev`)に
  更新する

---

## B. Next.jsアプリ(Cloudflare Workers / OpenNext)

API Routesを使う3アプリ(tiryou-karte・spm-medical-record・itonomaki)は
Cloudflare Pagesではなく **Cloudflare Workers** にデプロイします。各アプリの
ディレクトリに `open-next.config.ts` と `wrangler.jsonc` を用意済みです。

### デプロイ手順(アプリごとに実行)

```bash
cd apps/tiryou-karte   # または spm-medical-record, itonomaki/web

npm install
npx wrangler login      # 初回のみ。ブラウザでCloudflareにログイン

npm run cf:deploy       # = opennextjs-cloudflare build && wrangler deploy
```

`wrangler login` の代わりに `CLOUDFLARE_API_TOKEN` 環境変数(Workers編集権限
付き)を設定しておいても実行できます。

### 自動デプロイ(GitHub Actions)

`.github/workflows/deploy-tiryou-karte.yml`・`deploy-spm-medical-record.yml`・
`deploy-itonomaki.yml` を用意済みです。各アプリのディレクトリに変更を
push(`main`ブランチ)すると、GitHub Actionsが自動で `npm run cf:deploy` を
実行します。手元でコマンドを打たなくても、コードを変更してpushするだけで
デプロイされるようになります。

利用するには、GitHubリポジトリの **Settings → Secrets and variables →
Actions** で以下の2つを登録してください。

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

登録されていない場合、ワークフローはエラーで失敗します(手動での
`npm run cf:deploy` には影響しません)。Secrets登録後の最初の1回は、
GitHubの「Actions」タブから該当ワークフローを開き「Run workflow」で
手動実行することもできます(`workflow_dispatch` に対応済み)。

環境変数(Notionトークンなど)はこのワークフローでは設定されません。
`wrangler secret put` で事前にCloudflare側に設定しておいた値がそのまま
使われます(secretsはデプロイのたびに消えたりしません)。

### 各アプリで必要な環境変数(Secrets)

Workerの環境変数(Secrets)は `wrangler secret put` で1つずつ設定します
(値は標準入力から読み込むので、コマンド履歴やシェルに平文で残りません)。

**tiryou-karte:**
```bash
cd apps/tiryou-karte
for key in NOTION_TOKEN NOTION_MEMBERS_DATABASE_ID NOTION_MEDICAL_KARTE_DATABASE_ID \
  NOTION_RACE_RESULTS_DATABASE_ID NOTION_PERSONAL_KARTE_DATABASE_ID \
  NOTION_BLOOD_TEST_DATABASE_ID NOTION_PLAYER_PROFILE_DATABASE_ID NOTION_INBODY_DATABASE_ID; do
  npx wrangler secret put "$key"
done
```

**spm-medical-record:**
```bash
cd apps/spm-medical-record
for key in NOTION_TOKEN NOTION_DATABASE_ID NOTION_MEMBERS_DATABASE_ID \
  NOTION_RACE_RESULTS_DATABASE_ID NOTION_MEDICAL_KARTE_DATABASE_ID \
  NOTION_BLOOD_TEST_DATABASE_ID NOTION_PLAYER_PROFILE_DATABASE_ID; do
  npx wrangler secret put "$key"
done
```
(値はtiryou-karteと共通でOKと確認済み)

**itonomaki:** 現時点では設定不要です(下記「既知の制限」参照。`SITE_USER`
等は動作に必須ではなく、`GITHUB_TOKEN`/`FTP_*`は今は使えないため)。

### 既知の制限(Cloudflare移行に伴い一時的に無効化した機能)

- **itonomakiのサイト全体Basic認証**: 無効化中。Next.js 16の `proxy.ts`
  (旧middleware)は常にNode.jsランタイムでのみ動作し、Cloudflare側が未対応の
  ため `src/proxy.ts` を `src/proxy.ts.vercel-only` に退避してビルドから除外
  している。限定公開にしたい場合は代わりに
  [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
  をこのWorkerの前段に設定する(ダッシュボードのみで完結、コード変更不要)。
- **itonomakiのFTP経由の機能**(写真/PDFアップロード、ストップウォッチの音声
  共有、点呼名簿): ビルドは通るが実行時に失敗する。CloudflareのWorkers環境が
  Node標準のFTP通信に対応していないため。Cloudflare R2への置き換えが必要
  (別タスク)。点呼名簿はNotionの部員DBから取得する方式への変更を検討中。
- **spm-medical-recordの写真アップロード**(`@vercel/blob` 使用):
  Vercel専用のためCloudflareでは動作しない。Cloudflare R2への置き換えが必要
  (別タスク)。

これら以外の機能(閲覧・Notion連携・タスク管理・寮費清算など)はCloudflare上で
問題なく動作します。

---

## itonomakiの旧Vercelプロジェクトについて

`itonomaki` は `https://agu-itonomaki.aoyamagakuin-shimoda.workers.dev` に
デプロイ済みです。これまで本番で使われていた `itonomaki-55ve`(Vercel)は
もう使いません。`stopwatch` のコード内にこの旧URLが直書きされている箇所
(`SHARED_AUDIO_API_URL` / `ROLLCALL_ROSTER_API_URL`)がまだ残っていますが、
該当機能はいずれもFTP依存で現状Cloudflareでは動作しないため実害はありません。
FTP機能をR2などに置き換えて復活させる際に、この2箇所のURLも新しいWorkerの
URLへまとめて更新してください。
