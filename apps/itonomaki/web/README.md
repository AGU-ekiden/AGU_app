# トレーナー知見ライブラリ (web)

`../notion_sync/content` 以下の Markdown(フィジカル・メンタル・部位別・種目別・トレーナーの5カテゴリ、159トピック)を読み込んで表示する閲覧用サイトです。Notion と同じ内容を、ブラウザで見やすいレイアウト・検索・ダークモード付きで公開するためのものです。

コンテンツは `../notion_sync/content/**/*.md` を直接編集して git に push する方法に加え、サイト右上の編集アイコン(`/edit`)からブラウザ上で追記・新規トピック作成もできます(下記「ウェブ編集機能」参照)。

## 仕組み

- `npm run dev` / `npm run build` の前に `scripts/copy-content.mjs` が自動実行され、`../notion_sync/content` を `web/content` にコピーします(`web/content` は git 管理外)。
- 各ページはビルド時に静的HTML化されます(`generateStaticParams`)。そのため **コンテンツを更新したら再ビルド(= 新しい commit を push)しないとサイトには反映されません。**
- Markdown → 画面表示への変換は `notion_sync/md_to_blocks.py`(Notion同期用)と同じ記法を `src/lib/markdown.ts` で解釈しています(見出し・💡/⚠️コールアウト・テーブル・チェックリスト・太字/コード)。

## ローカルで動かす

```bash
npm install
npm run dev
```

http://localhost:3000 を開きます。

## パスワード保護(限定公開)

`src/proxy.ts` が全ページに Basic 認証をかけます。環境変数 `SITE_USER` / `SITE_PASSWORD` を設定するとURLを知っている人だけがユーザー名・パスワードでアクセスできるようになります(未設定の場合は認証なしで誰でも見られます)。

ローカルで試す場合は `.env.example` を `.env.local` にコピーして値を設定してください。

## ウェブ編集機能

サイト右上の編集アイコンから `/edit` を開くと、ブラウザから既存トピックへの追記・新規トピックの作成ができます。閲覧用の Basic 認証(`SITE_USER`/`SITE_PASSWORD`)とは別に、編集専用のパスワード(`EDIT_PASSWORD`)でさらにログインが必要です。

保存すると `notion_sync/content/<カテゴリ>/<トピック>.md` に直接コミットされ(GitHub Contents API 経由、`GITHUB_TOKEN` が必要)、Vercel の自動デプロイで数十秒〜数分後にサイトへ反映されます。git を直接操作するのと同じ変更が起きるだけなので、Notion への同期(`notion_sync/sync_to_notion.py`)も次回実行時に反映されます。

必要な環境変数(`.env.example` 参照): `EDIT_PASSWORD`、`GITHUB_TOKEN`(このリポジトリへの `contents:write` 権限が必要)。未設定の場合、`/edit` にアクセスしても保存はできません。

### 写真のアップロード

編集画面から写真も追加できます。アップロードされた写真は自動でリサイズ・圧縮(最大1600px、JPEG品質82)された上で、git リポジトリではなく **FTP 経由でトレーナーの既存の Xserver ホスティング**(`library-images` フォルダ)にアップロードされ、そのURLが本文に挿入されます。Vercel のデプロイサイズ制限を回避しつつ、既に契約しているホスティングを再利用する形です。

必要な環境変数(`.env.example` 参照): `FTP_HOST` / `FTP_USER` / `FTP_PASSWORD`。未設定の場合、写真アップロードのみ失敗します(それ以外の編集機能には影響しません)。

## ストップウォッチアプリ向け音声API(`/api/stretch-audio`)

同じモノレポ内の `apps/stopwatch` のストレッチ・補強タイマーが、セリフの録音をチームで共有するために呼び出すAPIです。このNext.jsアプリのページとは無関係で、ストップウォッチ側のJavaScriptからこのドメインへ直接(クロスオリジンで)fetchされます。

ストップウォッチ側にはセリフを読み上げるタイマーが「ストレッチ」「補強」の2つ独立してあり、録音は必ず `category`(`stretch` または `reinforce`、省略時は `stretch`)で区別されます。同じ「反対」という言葉でもストレッチ用と補強用は別の録音として扱われ、混ざりません。各カテゴリの中でさらに、名前付きの「セット」(例:コーチごとの読み上げ一式)にまとめられます。

元々(カテゴリ・セット機能導入前)の実装はどちらの概念もなく `library-images/stretch-audio/` 直下にセリフごとのファイルを1つずつ置くだけだったため、その挙動をそのまま `category: "stretch"` の「デフォルト(これまでの録音)」という暗黙のセットとして扱い、`category`/`setName` を省略/未指定だとこの位置として読み書きします(そのため既存の録音は無変換でそのまま使えます)。それ以外は `library-images/stretch-audio/<セット名>/`(stretchの他セット)、`library-images/stretch-audio/reinforce/`(補強のデフォルトセット)、`library-images/stretch-audio/reinforce/<セット名>/`(補強の他セット)に保存されます(`reinforce` はこの用途で予約されており、stretchのセット名としては使えません)。

- `GET /api/stretch-audio` — 現在共有されている録音の一覧を `{ items: [{ category, setName, text, url }, ...] }` で返します(認証不要、誰でも取得・再生可能)。カテゴリ・セット一覧はこの `items` から重複除去して求められます
- `POST /api/stretch-audio` — `multipart/form-data` で `file`(音声)、`text`(セリフ)、`category`(`stretch`/`reinforce`、省略時は`stretch`)、`setName`(セット名、省略時はデフォルトセット)を受け取り、写真と同じFTP経由でXserverに保存します。ヘッダー `Authorization: Bearer <STRETCH_AUDIO_TOKEN>` が必要です。同じ `category`+`setName`+`text` への再アップロードは既存ファイルを置き換えます
- `DELETE /api/stretch-audio?category=...&setName=...&text=...` — 指定したカテゴリ・セットの、指定したセリフの録音を削除します
- `DELETE /api/stretch-audio?category=...&setName=...`(`text`省略) — 指定したカテゴリ・セット全体(その中の全セリフの録音)を削除します
- 上記2つのDELETEはどちらも `Authorization` ヘッダーが必要です

必要な環境変数(`.env.example` 参照): `STRETCH_AUDIO_TOKEN`(書き込み保護用の合言葉。未設定の場合、一覧取得はできますがアップロード・削除は失敗します)、`FTP_HOST` / `FTP_USER` / `FTP_PASSWORD`(上記の写真アップロードと共通)。

## Cloudflareへのデプロイ

`@opennextjs/cloudflare` でCloudflare Workers上に配信する構成にしている。
詳細な手順は `scripts/README.md`(リポジトリルート)を参照。

### 既知の制限(移行に伴い一時的に無効化した機能)

- **サイト全体のBasic認証(`SITE_USER`/`SITE_PASSWORD`)は現在無効**。Next.js 16
  では認証を行う `proxy.ts`(旧middleware)が常にNode.jsランタイムでのみ動作し、
  CloudflareのOpenNextアダプタが現時点でNode.jsランタイムのProxy/Middlewareを
  サポートしていないため、`src/proxy.ts` を `src/proxy.ts.vercel-only` に退避し
  てビルドから除外している。限定公開にしたい場合は、代わりに
  [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
  をこのWorkerの前段に設定するのがCloudflare的には正攻法(コード変更不要、
  ダッシュボードで設定)。OpenNext側が対応した場合は `proxy.ts.vercel-only` を
  `proxy.ts` に戻せば元の挙動に戻せる。
- **FTP経由の機能(写真アップロード・PDFアップロード・ストップウォッチ音声共有
  ・点呼名簿)はビルドは通るが実行時に失敗する**。CloudflareのWorkers環境は
  Node.js標準のFTP通信に対応していないため。Cloudflare R2への置き換えが必要
  (別タスクで対応予定)。閲覧・Notion同期・Web編集(画像/PDF以外)は問題なく動作
  する。

### 旧Vercel環境について

以前は `itonomaki-55ve` としてVercelにデプロイされていたが、Cloudflareへ移行
した。Vercel向けにNext.jsのMiddleware/Proxyを使う場合は `proxy.ts.vercel-only`
を参考にすること。

以降は `claude/trainer-knowledge-notion-xg5660` ブランチ(または本番運用するブランチ)に push するたびに自動で再デプロイされます。
