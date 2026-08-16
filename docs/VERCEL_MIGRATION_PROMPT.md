# Vercel移行 引き継ぎプロンプト

> **使い方**
> 別アカウント(別のClaudeセッション)でこの移行作業をやってもらうための指示書です。
> 次のどちらかの方法で渡してください。
>
> - **方法A(推奨)**: 新しいセッションで `AGU-ekiden/AGU_app` を開き、
>   「`docs/VERCEL_MIGRATION_PROMPT.md` を読んで、その内容に従って移行を実行して」と伝える
> - **方法B**: 以下「ここから下をコピー」以降を全文コピーしてプロンプトとして貼り付ける
>
> **注意**: このファイルに秘密情報(Notionトークン等)は書いていません。
> 実際の値は手元の `.env.vercel.local`(gitignore済み・コミットされていない)にあります。
> 新しい環境で作業する場合は、その値を手元に用意してから始めてください。

---

<!-- ここから下をコピー -->

## あなたへの依頼

`AGU-ekiden/AGU_app` リポジトリ(青山学院大学陸上部のチーム用アプリのモノレポ)を、
**Cloudflare から Vercel に全面移行**してください。10個のアプリが対象です。

作業ブランチは新しく `claude/migrate-to-vercel` を切って、そこで進めてください。
`main` への直接コミットはしないでください(マージは人間が判断します)。

---

## 1. 背景:なぜ移行するのか

### これまでの経緯

このリポジトリは元々バラバラのリポジトリにあった10個のWebアプリを1つのモノレポに統合し、
ルート直下にそれらへの入口となる**ポータルサイト**を置いた構成です。

一度Vercelでの運用を試みたあとCloudflareに全面移行し、現在は全アプリがCloudflare上で
**動作しています**。しかし以下の2つの理由からVercelに戻すことになりました。

**理由1: Cloudflare Workersで動かない機能がある**

| アプリ | 動かない機能 | 原因 |
| --- | --- | --- |
| itonomaki | 写真/PDFアップロード、ストレッチ音声共有、点呼名簿 | `basic-ftp` がWorkersのランタイムで動かない |
| itonomaki | サイト全体のBasic認証 | Next.js 16の `proxy.ts` はNode.jsランタイム専用で、OpenNext/Cloudflareが未対応 |
| spm-medical-record | 写真アップロード | `@vercel/blob` がVercel専用 |

これらはすべて**Vercel(Node.jsランタイム)なら動く**ため、移行すれば復活が見込めます。

**理由2: 同一オリジン化の仕組みをより素直に作れる**

iPhoneで「ホーム画面に追加」してPWA(standalone)として使うと、**オリジンをまたぐ
ナビゲーションのたびにSafariのアドレスバーが再表示されてしまいます**。
各アプリが `*.pages.dev` / `*.workers.dev` の別オリジンに散っていたため、
「ポータル→アプリ」「アプリ→ポータル」の行き来のたびにこれが起きていました。

対策としてCloudflare Workersで自作のリバースプロキシ(`gateway/`)を書いて
パスで振り分ける方式にしましたが、Vercelなら `vercel.json` の `rewrites`
(いわゆるMulti Zones)で同じことがもっと素直に書けます。

### 重要:同一オリジン化のための下準備は**すでに完了しています**

前のセッションで以下をすべて実施済みです。**この成果はVercelでもそのまま使えます。
やり直す必要はありません。**

- `apps-data.js` の `liveUrl` を絶対URLから**相対パス**(`/stopwatch/` など)に変更済み
- 全9アプリの「← ポータル」リンクを `/`(相対パス)に変更済み
- Viteアプリ2つ(`ryouhi`・`label_create`)に `base: './'` を設定済み
- Next.jsアプリ3つに `basePath` を設定済み(`/tiryou-karte`・`/spm-medical-record`・`/itonomaki`)
  - あわせて `fetch("/api/...")` のような手書きの絶対パス約38箇所を、
    各アプリの `src/lib/api-path.ts` にある `apiPath()` でプレフィックスを付けるよう修正済み
  - `next/link`・`useRouter`・`next/image` はNext.jsが自動でbasePathを付けるので対象外

つまり**アプリ側はすでに「プレフィックス配下で配信される」前提のコードになっています**。
Vercel移行で必要なのは「振り分ける側」をCloudflare Workerから `vercel.json` に
差し替えることだけです。

---

## 2. ゴール(完了条件)

1. 10個すべてがVercelにデプロイされ、正常に動作している
2. **1つのオリジン**(ポータルのVercelドメイン)配下に、パスで全アプリがぶら下がっている
   - `/` → ポータル / `/stopwatch/` → ストップウォッチ / `/tiryou-karte/` → メディカルカルテ …
3. iPhoneでホーム画面に追加し、ポータル⇔各アプリを行き来してもSafariのヘッダーが出ない
4. Cloudflareで動かなかった機能(FTP系・`@vercel/blob`・Basic認証)が復活している
5. Cloudflare関連のコード・設定がリポジトリから削除されている
6. README等のドキュメントが新しい構成に合わせて更新されている

---

## 3. 対象アプリ一覧

`apps/task` は**対象外**です(過去に誤って作られたもので、ポータルにも載っていません。
ソースコードはリポジトリに残しますが、デプロイはしません)。

| # | アプリID | Vercelプロジェクト名(案) | Root Directory | 種別 | 公開パス |
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

- 静的アプリ(2〜5): Framework Preset = **Other**、Build Command は空、Output Directory はルート
- Viteアプリ(6〜7): Framework Preset = **Vite**、Build = `npm run build`、Output = `dist`
- Next.jsアプリ(8〜10): Framework Preset = **Next.js**(既存の `vercel.json` / 自動検出でOK)

> **旧Vercelプロジェクトについて**: 以前のアカウントに `itonomaki-55ve` という
> プロジェクトがありましたが、別アカウントに移るので**新規に `agu-itonomaki` を作成**してください。

---

## 4. 移行手順

### Phase 0: 事前準備(人間にやってもらうこと)

作業を始める前に、依頼者に以下を確認・実施してもらってください。
**これらが済んでいないと後の工程が全部止まります。**

1. **新しいVercelアカウント/チームを作る**
2. **そのVercelアカウントに GitHub の `AGU-ekiden/AGU_app` へのアクセスを許可する**
   - Vercelのダッシュボードから GitHub 連携 → `AGU-ekiden` organization を認可
   - orgの管理者承認が必要な場合があるので早めに
3. **Vercelのアクセストークンを発行する**(CLI/API用)
   - Vercel → Settings → Tokens → Create
4. **環境変数の値を手元に用意する**
   - 前の環境の `.env.vercel.local`(gitignore済み)にすべて入っています
   - 無い場合はNotionインテグレーションの管理画面から取り直しが必要

### Phase 1: ブランチを切る

```bash
git fetch origin main
git checkout -B claude/migrate-to-vercel origin/main
```

### Phase 2: Vercelプロジェクトを10個作る

`scripts/setup_vercel.py` と `scripts/vercel-apps.json` が**すでにリポジトリにあります**
(以前Vercelを試したときの遺産)。ただし内容が古いので、まず現状に合わせて更新してください。

**`scripts/vercel-apps.json` の要修正点:**

- `task`(`agu-task`)のエントリを**削除**する(対象外のため)
- `itonomaki` の `projectName` を `itonomaki-55ve` → `agu-itonomaki` に変更し、
  `skipAutoCreate: true` を**削除**する(新規作成させるため)
- `spm-medical-record` の `envVars` に `BLOB_READ_WRITE_TOKEN` を追加する
  (`@vercel/blob` 用。Vercelダッシュボードで Blob ストアを作ると自動で入ることもある)

そのうえでスクリプトを実行します。実行前に必ず `--dry-run` で内容を確認してください。

```bash
cp .env.vercel.local.example .env.vercel.local
# .env.vercel.local を実際の値で埋める(このファイルはコミットされない)

export VERCEL_TOKEN=xxxxxxxx
python3 scripts/setup_vercel.py --dry-run
python3 scripts/setup_vercel.py
```

スクリプトが期待通り動かない場合は、無理に直そうとせず**Vercelダッシュボードから
手動で10個作る**方が早いこともあります。その場合は上の表の Root Directory /
Framework Preset / Build設定をそのまま使ってください。

**注意点:**

- Production Branch は **`main`** に設定すること
  (過去に「mainブランチが存在せずデプロイが1回も走らない」という事故がありました。
  現在 `main` は存在します)
- 各プロジェクトの **Node.js Version は 22.x** にすること(Next.js 16のため)

### Phase 3: ポータルに rewrites を設定して1オリジン化する

リポジトリルートに `vercel.json` を新規作成します。これが「振り分ける側」で、
`gateway/src/index.ts`(Cloudflare Worker)の置き換えになります。

考え方はCloudflare版と同じで、**2種類の振り分け**があります。

- **静的/Viteアプリ**: アプリ自体はプレフィックスを知らない(相対パスでビルドされているだけ)
  → **プレフィックスを剥がして**転送する
- **Next.jsアプリ**: アプリ自体が `basePath` でプレフィックスを知っている
  → **プレフィックスを付けたまま**転送する

```jsonc
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    // --- 静的/Viteアプリ: プレフィックスを剥がして転送 ---
    { "source": "/tokei/:path*",        "destination": "https://agu-tokei.vercel.app/:path*" },
    { "source": "/stopwatch/:path*",    "destination": "https://agu-stopwatch.vercel.app/:path*" },
    { "source": "/taskkyoyu/:path*",    "destination": "https://agu-taskkyoyu.vercel.app/:path*" },
    { "source": "/meal_traker/:path*",  "destination": "https://agu-meal-traker.vercel.app/:path*" },
    { "source": "/ryouhi/:path*",       "destination": "https://agu-ryouhi.vercel.app/:path*" },
    { "source": "/label_create/:path*", "destination": "https://agu-label-create.vercel.app/:path*" },

    // --- Next.jsアプリ: basePathがあるのでプレフィックスを付けたまま転送 ---
    { "source": "/tiryou-karte/:path*",
      "destination": "https://agu-tiryou-karte.vercel.app/tiryou-karte/:path*" },
    { "source": "/spm-medical-record/:path*",
      "destination": "https://agu-spm-medical-record.vercel.app/spm-medical-record/:path*" },
    { "source": "/itonomaki/:path*",
      "destination": "https://agu-itonomaki.vercel.app/itonomaki/:path*" }
  ],
  "redirects": [
    // 末尾スラッシュ無しで来た場合、相対パス解決が壊れるのでスラッシュ付きへ寄せる
    { "source": "/tokei",        "destination": "/tokei/",        "permanent": false },
    { "source": "/stopwatch",    "destination": "/stopwatch/",    "permanent": false },
    { "source": "/taskkyoyu",    "destination": "/taskkyoyu/",    "permanent": false },
    { "source": "/meal_traker",  "destination": "/meal_traker/",  "permanent": false },
    { "source": "/ryouhi",       "destination": "/ryouhi/",       "permanent": false },
    { "source": "/label_create", "destination": "/label_create/", "permanent": false }
  ]
}
```

**必ず実際のデプロイURLに置き換えてください。** 上記の `agu-xxx.vercel.app` は例です。
Vercelはプロジェクト名が衝突すると `agu-tokei-abc123.vercel.app` のようなサフィックス付きに
なることがあるので、Phase 2完了後に実際のProduction URLを確認して埋めてください。

> **補足**: この段階では各アプリの `*.vercel.app` に直接アクセスしても動きます
> (ポータル経由が「正」ですが、直アクセスを塞ぐ必要は必ずしもありません)。
> 塞ぎたい場合は各プロジェクトで Deployment Protection を設定する手もありますが、
> **rewriteの転送先が保護されていると振り分けが失敗する**ので、やるなら慎重に。

### Phase 4: Vercelでしか動かなかった機能を復活させる

ここがVercelに戻す最大の目的です。**1つずつ、動作確認しながら**進めてください。

#### 4-1. itonomaki: サイト全体のBasic認証を復活

Cloudflare移行時に `src/proxy.ts` を `src/proxy.ts.vercel-only` にリネームして
ビルドから除外していました。これを戻します。

```bash
git mv apps/itonomaki/web/src/proxy.ts.vercel-only apps/itonomaki/web/src/proxy.ts
```

**確認事項**: このコードは `basePath` を追加する**前**に書かれたものです。
matcher は `["/((?!_next/static|_next/image|favicon.ico).*)"]` というカタチの
除外付き全体マッチで、Next.jsの仕様上 matcher のパスは basePath 相対に解釈されるため
おそらくそのままで動きますが、**実際に `/itonomaki/` にアクセスして401が返ること、
認証後に静的アセットも含めて正常に表示されることを必ず確認**してください。

環境変数 `SITE_USER` / `SITE_PASSWORD` を設定すると認証が有効になり、
未設定なら誰でも閲覧できます(依頼者に「認証をかけたいかどうか」を確認してください)。

なお `next.config.ts` の `experimental.proxyClientMaxBodySize: "25mb"` は
このproxyのための設定なので、そのまま残してください
(スマホの大きい写真をアップロードするときに必要)。

#### 4-2. itonomaki: FTP経由の機能を復活

`basic-ftp` がNode.jsランタイムで動くようになるので、以下が復活するはずです。

- `src/app/api/edit/upload-image/route.ts`(写真アップロード)
- `src/app/api/edit/upload-pdf/route.ts`(PDFアップロード)
- `src/app/api/edit/rotate-image/route.ts`(画像回転)
- `src/app/api/stretch-audio/route.ts`(ストレッチ音声共有)
- `src/app/api/rollcall-roster/route.ts`(点呼名簿)

コード変更は基本不要で、環境変数 `FTP_HOST` / `FTP_USER` / `FTP_PASSWORD` /
`STRETCH_AUDIO_TOKEN` を設定すれば動くはずです。**実際にアップロードを試して確認**してください。

#### 4-3. spm-medical-record: 写真アップロードを復活

`@vercel/blob` がそのまま使えます。

- Vercelダッシュボードで **Blob ストアを作成**し、`agu-spm-medical-record` プロジェクトに接続
- `BLOB_READ_WRITE_TOKEN` が環境変数に入ることを確認
- 該当コード: `src/app/api/upload/route.ts` と `src/components/KarteForm.tsx`

#### 4-4. stopwatch: itonomaki APIの参照先を相対パスに直す

`apps/stopwatch/app.js` に**旧Vercelデプロイのハードコードされた絶対URL**が
2箇所残っています(Cloudflare時代はFTPが動かず使われていなかったので放置されていました)。

```js
// 1585行目あたり
const SHARED_AUDIO_API_URL = 'https://itonomaki-55ve.vercel.app/api/stretch-audio';
// 3025行目あたり
const ROLLCALL_ROSTER_API_URL = 'https://itonomaki-55ve.vercel.app/api/rollcall-roster';
```

**1オリジン化されるので、これは相対パスにできます**(クロスオリジンでなくなるのでCORSも不要):

```js
const SHARED_AUDIO_API_URL = '/itonomaki/api/stretch-audio';
const ROLLCALL_ROSTER_API_URL = '/itonomaki/api/rollcall-roster';
```

4-2でFTP機能が復活したら、この2つの機能もstopwatch側から実際に動くか確認してください。

#### 4-5. (任意)itonomakiのWeb編集機能

`src/lib/github.ts` はWeb編集(`/edit`)の保存先としてGitHub APIを直接叩きます。
保存先はすでにこのモノレポ(`AGU-ekiden/AGU_app` の
`apps/itonomaki/notion_sync/content`)に修正済みです。
`GITHUB_TOKEN`(このリポジトリへの `contents:write` 権限)と `EDIT_PASSWORD` を
設定すれば動きます。

### Phase 5: Cloudflare関連の削除とドキュメント更新

**Phase 4までの動作確認が終わってから**着手してください。先に消すと戻れなくなります。

**削除するもの:**

- `gateway/` ディレクトリ一式(Cloudflareのリバースプロキシ。`vercel.json` が置き換える)
- 各Next.jsアプリの `open-next.config.ts` と `wrangler.jsonc`
  (`apps/tiryou-karte`・`apps/spm-medical-record`・`apps/itonomaki/web`)
- 各Next.jsアプリの `package.json` から `cf:build` / `cf:preview` / `cf:deploy` スクリプトと、
  devDependenciesの `@opennextjs/cloudflare`・`wrangler`
- `.github/workflows/deploy-tiryou-karte.yml`・`deploy-spm-medical-record.yml`・
  `deploy-itonomaki.yml`(Cloudflare Workers向けの自動デプロイ。VercelはGit連携で
  自動デプロイされるので不要)
- `scripts/setup_cloudflare.py` と `scripts/cloudflare-apps.json`

**更新するもの:**

- `README.md`:「デプロイ先: Cloudflare」のセクションをVercel前提に書き直す。
  ゲートウェイの説明を `vercel.json` の rewrites に差し替える。
  アプリ一覧表の「ゲートウェイ配下のパス」はパス自体は変わらないのでそのまま使える
- `scripts/README.md`: Cloudflare向けの手順(A/B/C章)を全面的にVercel向けに書き直す。
  「既知の制限」に書いてあるCloudflareで動かない機能の記述は、
  復活したなら削除し、まだ動かないものだけ残す
- `apps-data.js` の冒頭コメント: デプロイ先の説明がCloudflareになっているので直す

**最後に(人間にやってもらう):**

- Cloudflare側のプロジェクトを削除する
  (Pages: `agu-portal`・`agu-tokei`・`agu-stopwatch`・`agu-taskkyoyu`・`agu-ryouhi`・
  `agu-meal-traker`・`agu-label-create`、および誤作成された `agu-task` /
  Workers: `agu-gateway`・`agu-tiryou-karte`・`agu-spm-medical-record`・`agu-itonomaki`)
- iPhoneのホーム画面ショートカットを、新しいポータルURLで登録し直す

---

## 5. 環境変数一覧

値は依頼者の手元の `.env.vercel.local` にあります。**このファイルはコミットしないでください**
(`.gitignore` 済み)。Vercelでは各プロジェクトの Settings → Environment Variables に
登録します(Production / Preview / Development すべてにチェック推奨)。

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
BLOB_READ_WRITE_TOKEN              (写真アップロード用。Blobストア接続で自動設定されることも)
```

> Notion関連の値は tiryou-karte と spm-medical-record で**共通で問題ない**ことを確認済みです。

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

その他のアプリ(portal・tokei・stopwatch・taskkyoyu・meal_traker・label_create)は
環境変数なしで動きます。

---

## 6. 既知の落とし穴(過去に実際にハマったもの)

移行作業中に高確率で踏むので、先に読んでおいてください。

1. **`main` ブランチにデプロイ設定を向けること**
   以前、リポジトリに `main` が無い状態でVercelプロジェクトを作ってしまい、
   「プロジェクトはできているのにデプロイが1回も走らない」という状態で長時間ハマりました。
   現在 `main` は存在します。各プロジェクトの Production Branch が `main` か必ず確認を。

2. **依頼者の環境はWindows / PowerShell**
   - `npm` / `npx` が「スクリプトの実行が無効」エラーになる場合は、
     **`npm.cmd` / `npx.cmd`** と書けば回避できます
   - **コマンドを渡すときは、どのディレクトリで実行するかを毎回明示**してください
     (`cd apps\tiryou-karte` を忘れて何度もエラーになりました)
   - PowerShellのパイプで値を外部コマンドに渡すと、**末尾1文字が欠ける現象**が
     実際に起きました。秘密値は必ず1つずつ手入力・貼り付けで設定し、成功表示を都度確認してください
   - `sharp`(itonomakiの依存)のインストールで `EPERM: symlink` が出たら、
     Windowsの開発者モードを有効にするか管理者権限のPowerShellで実行

3. **`@notionhq/client` に渡している `fetch` について**
   `src/lib/notion.ts`(tiryou-karte・spm-medical-record両方)で
   `new Client({ auth: ..., fetch: globalThis.fetch })` のように
   **明示的に `fetch` を渡しています**。これはCloudflare Workers対策で入れたものですが、
   **Vercelでもそのままで問題ありません**。消さないでください
   (消す必要が無いうえ、消すと `node-fetch` 経由に戻ってしまいます)。

4. **Next.jsアプリのbasePathとrewriteの対応を間違えない**
   静的アプリは「プレフィックスを剥がす」、Next.jsアプリは「プレフィックスを付けたまま」です。
   ここを取り違えると404になります(Cloudflare版で実際に `/itonomaki/` が
   「There is nothing here yet」になる不具合が出ました)。

5. **末尾スラッシュ**
   `/stopwatch`(スラッシュ無し)でアクセスすると相対パス解決が壊れます。
   `vercel.json` の `redirects` でスラッシュ付きに寄せてください(Phase 3に記載済み)。

6. **Next.js 16の破壊的変更に注意**
   このリポジトリのNext.jsは **16.3.1** で、`middleware.js` は `proxy.ts` に
   名前が変わっています。学習データの知識と食い違う可能性が高いので、
   迷ったら `apps/itonomaki/web/node_modules/next/dist/docs/` の
   ドキュメントを読んでから書いてください
   (`apps/itonomaki/web/AGENTS.md` にも同じ注意書きがあります)。

7. **ビルド成果物をコミットしない**
   `.next/` `.open-next/` `node_modules/` `dist/` は `.gitignore` 済みですが、
   過去にビルド後の `.open-next/` が作業ツリーに残ってgrep結果を汚染したことがあります。
   コミット前に `git status` を確認してください。

---

## 7. 進め方についてのお願い

- Phaseごとに区切って、**動作確認できたらコミット**してください
  (一気に全部やって最後に壊れていると原因の切り分けが困難です)
- 依頼者はVercel/Cloudflareのダッシュボード操作とローカルでのコマンド実行を担当します。
  **あなたが直接デプロイAPIを叩けない環境の可能性が高い**ので、
  依頼者に実行してもらうコマンドは**コピペできる形で、実行ディレクトリ付きで**提示してください
- 各アプリの詳細は `apps/<アプリID>/README.md` に元々のセットアップ手順があります
- 判断に迷う点(認証をかけるか、旧プロジェクトを消すか等)は
  勝手に決めず依頼者に確認してください

<!-- ここまで -->
