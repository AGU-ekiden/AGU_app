# デプロイセットアップスクリプト(Vercel)

このリポジトリは **Vercel** に統一してデプロイする方針です。静的サイトもViteアプリもNext.jsアプリも、同じ仕組み(Vercelのgit連携による自動ビルド)でデプロイされます。`apps/task` は対象外です(過去に誤って作られたもので、ポータルにも掲載されていません)。

| # | アプリID | Vercelプロジェクト名 | Root Directory | 種別 | 公開パス |
| --- | --- | --- | --- | --- | --- |
| 1 | portal | `agu-portal` | (リポジトリルート) | 静的HTML | `/` |
| 2 | tokei | `agu-tokei` | `apps/tokei` | 静的HTML(単一ファイル) | `/tokei/` |
| 3 | stopwatch | `agu-stopwatch` | `apps/stopwatch` | 静的/Vanilla JS・PWA | `/stopwatch/` |
| 4 | taskkyoyu | `agu-taskkyoyu` | `apps/taskkyoyu` | 静的/Vanilla JS+GAS | `/taskkyoyu/` |
| 5 | meal_traker | `agu-meal-traker` | `apps/meal_traker` | 静的HTML(単一ファイル) | `/meal_traker/` |
| 6 | ryouhi | `agu-ryouhi` | `apps/ryouhi` | Vite(React) | `/ryouhi/` |
| 7 | label_create | `agu-label-create` | `apps/label_create` | Vite(React+TS) | `/label_create/` |
| 8 | tiryou-karte | `agu-tiryou-karte` | `apps/tiryou-karte` | Next.js 16 | `/tiryou-karte/` |
| 9 | spm-medical-record | `agu-spm-medical-record` | `apps/spm-medical-record` | Next.js 16 | `/spm-medical-record/` |
| 10 | itonomaki | `agu-itonomaki` | `apps/itonomaki/web` | Next.js 16 | `/itonomaki/` |
| 11 | training-log | `agu-training-log` | `apps/training-log` | Next.js 16 | `/training-log/`(未デプロイ) |

- 静的アプリ(2〜5): Framework Preset = **Other**、Build Command は空、Output Directory はルート
- Viteアプリ(6〜7): Framework Preset = **Vite**、Build = `npm run build`、Output = `dist`
- Next.jsアプリ(8〜11): Framework Preset = **Next.js**(既存の設定・自動検出でOK)

セットアップの実体は `setup_vercel.py` / `vercel-apps.json` の1組だけです(Cloudflare向けだった `setup_cloudflare.py` / `cloudflare-apps.json` は移行に伴い廃止しました)。

---

## A. 全アプリ共通のセットアップ手順

### 事前準備

1. **Vercelアカウント/チームを用意し、GitHubの `AGU-ekiden/AGU_app` へのアクセスを許可する**
   Vercelダッシュボード → GitHub連携 → `AGU-ekiden` organization を認可(org管理者の承認が必要な場合があるので早めに)
2. **Vercelのアクセストークンを発行する**(CLI/API用)
   Vercel → Settings → Tokens → Create
3. **環境変数の値を手元に用意する**
   Notionトークンなどの秘密値。無い場合はNotionインテグレーションの管理画面から取り直す

### `.env.vercel.local` を用意する

```bash
cp .env.vercel.local.example .env.vercel.local
# .env.vercel.local を実際の値で埋める(このファイルはコミットされない・.gitignore済み)
```

### 実行

```bash
export VERCEL_TOKEN=xxxxxxxxxxxxxxxx

# まずは --dry-run で内容を確認(実際のAPI呼び出しはしない)
python3 scripts/setup_vercel.py --dry-run

# 問題なければ実行
python3 scripts/setup_vercel.py

# 一部のアプリだけ実行したい場合
python3 scripts/setup_vercel.py --only ryouhi,label_create
```

### スクリプトがやること

`scripts/vercel-apps.json` の定義に従い、各アプリについて同名のVercelプロジェクトが無ければこのリポジトリと連携した状態で新規作成し、Root Directory・Framework Preset・Build設定を行い、`.env.vercel.local` に値があるキーだけ環境変数として登録します(既に同名の環境変数があれば上書きしません)。

### 注意点

- **Production Branch は `main` に設定すること**(`main` が存在しない状態でプロジェクトを作ってしまうと、「プロジェクトはできているのにデプロイが1回も走らない」状態になる事故が過去にあった)
- 各プロジェクトの **Node.js Versionは22.x**(Next.js 16のため)
- スクリプトが期待通り動かない場合、無理に直そうとせず**Vercelダッシュボードから手動で作成する**方が早いこともあります。その場合は上表のRoot Directory / Framework Preset / Build設定をそのまま使ってください

### 実行後にやること

- 各プロジェクトのデプロイが成功したら、実際のProduction URL(`https://<プロジェクト名>.vercel.app`。プロジェクト名が衝突すると `agu-tokei-abc123.vercel.app` のようにサフィックス付きになることがあるので必ず実URLを確認する)を、リポジトリルートの `apps-data.js` の該当アプリの `liveUrl`、および `vercel.json` の `rewrites` に反映する(次章「B. vercel.json による1オリジン化」を参照)

---

## B. vercel.json による1オリジン化

### これは何のためのものか

ポータルと各アプリは、それぞれ別々のVercelプロジェクトとして別々のドメイン(`*.vercel.app`)にデプロイされます。これ自体はブラウザで使う分には問題ありませんが、iPhoneで「ホーム画面に追加」(standalone表示)した場合、Safariはオリジンが変わるナビゲーションのたびにブラウザのUI(アドレスバーなど)を再表示してしまいます。ポータル→アプリ、アプリ→ポータルの行き来のたびにこれが起きます。

これを解消するため、リポジトリルートの **`vercel.json`** の `rewrites`(いわゆるVercelの「Multi Zones」の仕組み)で、ポータルのドメイン1つの配下に、パスのプレフィックスで各アプリを振り分けます。

```
https://<ポータルのVercelドメイン>/                     → ポータル本体
https://<ポータルのVercelドメイン>/tokei/               → agu-tokei.vercel.app
https://<ポータルのVercelドメイン>/stopwatch/           → agu-stopwatch.vercel.app
https://<ポータルのVercelドメイン>/taskkyoyu/           → agu-taskkyoyu.vercel.app
https://<ポータルのVercelドメイン>/meal_traker/         → agu-meal-traker.vercel.app
https://<ポータルのVercelドメイン>/ryouhi/              → agu-ryouhi.vercel.app
https://<ポータルのVercelドメイン>/label_create/        → agu-label-create.vercel.app
https://<ポータルのVercelドメイン>/tiryou-karte/        → agu-tiryou-karte.vercel.app/tiryou-karte/
https://<ポータルのVercelドメイン>/spm-medical-record/  → agu-spm-medical-record.vercel.app/spm-medical-record/
https://<ポータルのVercelドメイン>/itonomaki/           → agu-itonomaki.vercel.app/itonomaki/
```

振り分け方には2種類あります。

- **静的/Viteアプリ**: アプリ自体はプレフィックスを知らない(相対パスでビルドされているだけ)ので、**プレフィックスを剥がして**転送する
- **Next.jsアプリ**: `basePath` でプレフィックスを知っているので、**プレフィックスを付けたまま**転送する

ここを取り違えると404になります。

### 手順

1. 章A の手順で各Vercelプロジェクトをデプロイし、実際のProduction URLを確認する
2. リポジトリルートの `vercel.json` の `rewrites` の各 `destination` を実URLに置き換える
3. 末尾スラッシュ無し(例: `/stopwatch`)でアクセスされると`rewrites`のパターン(`/stopwatch/:path*`)にマッチせず404になるため、`vercel.json` に `"trailingSlash": true` を設定している(Vercelのデフォルトは逆にスラッシュを削除する方向なので明示的に反転させる必要がある)。拡張子付きのファイルリクエスト(`app.js`等)はこの設定の対象外なのでアセット読み込みには影響しない
4. ポータルのVercelプロジェクトに変更をデプロイし、`https://<ポータルのドメイン>/xxx/` で各アプリが正しく表示されることを確認する

`vercel.json` 自体の中身はリポジトリルートのファイルを直接参照してください。

> 補足: この段階では各アプリの `*.vercel.app` に直接アクセスしても動きます(ポータル経由が「正」ですが、直アクセスを塞ぐ必要は必ずしもありません)。塞ぎたい場合は各プロジェクトでDeployment Protectionを設定する手もありますが、rewriteの転送先が保護されていると振り分けが失敗するため、やるなら慎重に。

---

## C. Next.jsアプリ固有の設定

tiryou-karte・spm-medical-record・itonomaki の3つはNext.jsアプリです。環境変数はVercelダッシュボードの各プロジェクトの **Settings → Environment Variables** に登録します(Production / Preview / Development すべてにチェック推奨)。

### tiryou-karte(すべて必須)

```
NOTION_TOKEN
NOTION_MEMBERS_DATABASE_ID
NOTION_MEDICAL_KARTE_DATABASE_ID
NOTION_RACE_RESULTS_DATABASE_ID
NOTION_PERSONAL_KARTE_DATABASE_ID
NOTION_BLOOD_TEST_DATABASE_ID
NOTION_PLAYER_PROFILE_DATABASE_ID
NOTION_INBODY_DATABASE_ID
```

### spm-medical-record

```
NOTION_TOKEN                       (必須・tiryou-karteと同じ値)
NOTION_DATABASE_ID                 (必須・tiryou-karteのNOTION_PERSONAL_KARTE_DATABASE_IDと同じ値)
NOTION_MEMBERS_DATABASE_ID
NOTION_RACE_RESULTS_DATABASE_ID
NOTION_MEDICAL_KARTE_DATABASE_ID   (必須)
NOTION_BLOOD_TEST_DATABASE_ID      (必須)
NOTION_PLAYER_PROFILE_DATABASE_ID
BLOB_READ_WRITE_TOKEN              (写真アップロード用。Vercelダッシュボードで Blob ストアを作成しプロジェクトに接続すると自動で入ることもある)
```

Notion関連の値は tiryou-karte と spm-medical-record で共通で問題ないことを確認済みです。

### training-log(すべて必須。未デプロイ)

```
NOTION_TOKEN
NOTION_TRAINING_LOG_DATABASE_ID
NOTION_MEMBERS_DATABASE_ID         (任意。tiryou-karteと同じ値。設定すると「部員」relationを紐付ける)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
STRAVA_REDIRECT_URI                 https://<ポータルのドメイン>/training-log/api/strava/callback
```

Strava側の管理画面(https://www.strava.com/settings/api )で「Authorization Callback Domain」にポータルのドメインを登録する必要があります。詳細は `apps/training-log/README.md` 参照。

### itonomaki(すべて任意。未設定でも閲覧はできる)

```
SITE_USER            サイト全体のBasic認証。未設定なら誰でも閲覧可
SITE_PASSWORD
EDIT_PASSWORD        Web編集機能(/edit)用。未設定なら編集不可
GITHUB_TOKEN         AGU-ekiden/AGU_app への contents:write 権限が必要
FTP_HOST             写真/PDF/音声アップロード用
FTP_USER
FTP_PASSWORD
STRETCH_AUDIO_TOKEN  stopwatchアプリの音声共有APIの認証トークン
```

### ryouhi(任意。未設定ならダミーデータで動作)

```
VITE_GAS_API_URL
VITE_USE_DUMMY_DATA
```

その他のアプリ(portal・tokei・stopwatch・taskkyoyu・meal_traker・label_create)は環境変数なしで動きます。

### Vercelで復活する機能

Cloudflare Workers環境では、以下の機能がランタイムの制約で動作しませんでした。VercelはNode.jsランタイムで動作するため、**移行完了後は動作する見込み**です(実際の動作確認が済むまでは「復活予定」の位置づけとして扱ってください)。

- **itonomakiの写真/PDFアップロード・ストレッチ音声共有・点呼名簿**: `basic-ftp` を使っており、Cloudflare Workersのランタイムでは動作しませんでした。`FTP_HOST` / `FTP_USER` / `FTP_PASSWORD` / `STRETCH_AUDIO_TOKEN` を設定すればVercelで動作する見込みです。実際にアップロードを試して確認してください。該当コード: `src/app/api/edit/upload-image/route.ts`、`src/app/api/edit/upload-pdf/route.ts`、`src/app/api/edit/rotate-image/route.ts`、`src/app/api/stretch-audio/route.ts`、`src/app/api/rollcall-roster/route.ts`
- **itonomakiのサイト全体Basic認証**: Next.js 16の `proxy.ts`(旧middleware)はNode.jsランタイム専用で、Cloudflare/OpenNextが未対応だったため `src/proxy.ts.vercel-only` に退避してビルドから除外されていましたが、`src/proxy.ts` に戻し済みです。Vercelでは `SITE_USER` / `SITE_PASSWORD` を設定すれば有効になる見込みです。`/itonomaki/` にアクセスして401が返ること、認証後に静的アセットも含めて正常に表示されることを確認してください。
- **spm-medical-recordの写真アップロード**: `@vercel/blob` はVercel専用のため、Cloudflareでは動作しませんでした。Vercelダッシュボードで Blob ストアを作成しプロジェクトに接続すれば動作する見込みです。該当コード: `src/app/api/upload/route.ts`、`src/components/KarteForm.tsx`

### stopwatch: itonomaki APIの参照先

`apps/stopwatch/app.js` にあった、旧Vercelデプロイ(`itonomaki-55ve`)への絶対URL2箇所(`SHARED_AUDIO_API_URL` / `ROLLCALL_ROSTER_API_URL`)は、1オリジン化に合わせて相対パス(`/itonomaki/api/stretch-audio`・`/itonomaki/api/rollcall-roster`)へ書き換え済みです。デプロイ後、実際にこれらの機能が動作するか確認してください。

---

## D. 既知の落とし穴

1. **`main` ブランチにデプロイ設定を向けること** — `main` が存在しない状態でVercelプロジェクトを作ると、デプロイが1回も走らない状態になる。各プロジェクトのProduction Branchが `main` になっているか必ず確認する。
2. **依頼者の環境がWindows / PowerShellの場合がある** — `npm` / `npx` が実行できないエラーが出たら `npm.cmd` / `npx.cmd`。コマンドはどのディレクトリで実行するか毎回明示する。PowerShellのパイプで値を渡すと末尾1文字が欠ける現象があるため、秘密値は必ず1つずつ手入力・貼り付けで設定し、成功表示を都度確認する。`sharp`(itonomakiの依存)のインストールで `EPERM: symlink` が出たら、Windowsの開発者モードを有効にするか管理者権限で実行する。
3. **`@notionhq/client` に渡している `fetch` について** — `src/lib/notion.ts`(tiryou-karte・spm-medical-record両方)で `new Client({ auth: ..., fetch: globalThis.fetch })` のように明示的に `fetch` を渡している。これはCloudflare Workers対策で入れたものだが、Vercelでもそのままで問題ないため消さないこと(消す必要が無いうえ、消すと `node-fetch` 経由に戻ってしまう)。
4. **静的アプリとNext.jsアプリでrewriteの対応を間違えない** — 静的/Viteアプリは「プレフィックスを剥がす」、Next.jsアプリは「プレフィックスを付けたまま」。ここを取り違えると404になる。
5. **末尾スラッシュ** — Vercelはデフォルトで末尾スラッシュを削除する方向にリダイレクトするため、`rewrites`の`/stopwatch/:path*`のようなパターンにマッチしなくなり404になる(実際に発生した不具合)。`vercel.json` に `"trailingSlash": true` を設定して逆方向(スラッシュを付ける)にする。拡張子付きファイルはこの設定の対象外なので静的アセットの読み込みには影響しない。
6. **Next.js 16の破壊的変更に注意** — このリポジトリのNext.jsは **16.3.1** で、`middleware.js` は `proxy.ts` に名前が変わっている。学習データの知識と食い違う可能性が高いので、迷ったら `apps/itonomaki/web/node_modules/next/dist/docs/` のドキュメントを読んでから書く(`apps/itonomaki/web/AGENTS.md` にも同じ注意書きがある)。
7. **ビルド成果物をコミットしない** — `.next/` `node_modules/` `dist/` は `.gitignore` 済みだが、コミット前に `git status` を確認する。

より詳しい経緯・手順は `docs/VERCEL_MIGRATION_PROMPT.md`(移行の設計図として保存済み)を参照してください。
