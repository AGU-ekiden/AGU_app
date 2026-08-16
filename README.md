# AGU_app — チームアプリ モノレポ + ポータル

AGU駅伝部でこれまで作ってきた各種アプリ(タスク管理・寮費清算・メディカルカルテなど)をまとめたモノレポです。各アプリのコードは `apps/<アプリID>/` 以下にあり、それぞれ元のリポジトリから**切り離して**このリポジトリ内で開発を続けます(元のリポジトリとの同期は行いません)。ルート直下は、各アプリへの入り口となるポータルサイトです。

初回アクセス時に「選手 / マネージャー / スタッフ / メディカルトレーナー / フィジカルトレーナー」から役割を選ぶと、その役割用のメニュー(よく使う機能への直リンク)が表示されます。選択はブラウザに保存され、次回からは自動でそのメニューが開きます。「すべてのアプリ」からはアプリ単位の一覧(カテゴリ別)も見られます。

## リポジトリ構成

```
AGU_app/
├── index.html / style.css / script.js   ← ポータル本体
├── apps-data.js                          ← 掲載アプリの一覧データ
├── roles-data.js                         ← 役割ごとのメニューデータ
└── apps/
    ├── tokei/            静的HTML(単一ファイル)
    ├── stopwatch/         Vanilla JS / PWA
    ├── taskkyoyu/         Vanilla JS + GAS
    ├── task/              Vanilla JS + GAS
    ├── ryouhi/            React (Vite) + Tailwind + GAS
    ├── meal_traker/       静的HTML(単一ファイル)
    ├── label_create/      React (Vite) + TypeScript
    ├── tiryou-karte/      Next.js + Notion API
    ├── itonomaki/
    │   ├── web/           ← デプロイ対象はこちら(Next.js)
    │   └── notion_sync/   Notion同期用スクリプト(Python、非デプロイ)
    └── spm-medical-record/ Next.js + Notion API
```

## デプロイ先: Cloudflare

このリポジトリは **Cloudflare** に統一してデプロイします。アプリの種類で2つの経路に分かれます。

| 種類 | 対象アプリ | デプロイ先 |
| --- | --- | --- |
| 静的サイト・Viteアプリ | tokei, stopwatch, taskkyoyu, task, meal_traker, ryouhi, label_create, ポータル本体 | **Cloudflare Pages** |
| Next.js(SSR/API Routes) | tiryou-karte, spm-medical-record, itonomaki | **Cloudflare Workers**(`@opennextjs/cloudflare`) |

各アプリはこれまで別々のオリジン(`*.pages.dev` / `*.workers.dev`)で
公開されていましたが、`gateway/` にあるリバースプロキシWorkerが
`/stopwatch/` のようなパスプレフィックスで全部を1つのオリジンに束ねます
(iPhoneの「ホーム画面に追加」でアプリ間を移動してもSafariのヘッダーが
再表示されないようにするため)。実際にユーザーがブックマークするのは
このゲートウェイのURLです。詳細は `scripts/README.md` の
「C. ゲートウェイ」を参照してください。

セットアップ手順・スクリプトは `scripts/README.md` にまとめています。要点:

- 静的/Viteアプリは `scripts/setup_cloudflare.py` でPagesプロジェクトを一括作成
- Next.jsアプリは各ディレクトリで `npm run cf:deploy`(= `opennextjs-cloudflare build && wrangler deploy`)を実行してWorkerとしてデプロイ
- Next.jsアプリのうち、Cloudflareでは動かない機能(FTP経由の写真/音声アップロード、`@vercel/blob`)については `scripts/README.md` の「既知の制限」を参照

(以前はVercelでの運用を試していた名残として `scripts/setup_vercel.py` / `vercel-apps.json` も残っていますが、現在はCloudflareが正の方針です)

## アプリを改良する

各アプリのコードは `apps/<アプリID>/` の下にあります。中の `README.md` に元々のセットアップ手順が書かれているので参考にしつつ、通常のコード変更と同じように編集してください。Next.jsアプリはCloudflare向けに `next` を `16.3.1` 以上に、`@opennextjs/cloudflare` と `wrangler` を追加済みです。

## ポータルにアプリを追加・編集する

`apps-data.js` の `window.APPS` 配列にオブジェクトを1つ追加(または編集)します。

```js
{
  id: 'example',           // apps/example/ ディレクトリ名と一致させる
  name: '表示名',
  description: '1〜2行の説明',
  category: 'ops', // 'measure' | 'ops' | 'medical'
  icon: '📦',
  repoUrl: `${REPO_TREE}/apps/example`,
  rootDir: 'apps/example',  // デプロイ設定のRoot Directoryが apps/<id> と異なる場合のみ指定(itonomakiなど)
  liveUrl: '/example/', // gateway配下のパス(相対パス)。未デプロイ/未確認なら null
  urlConfidence: 'guess',  // URLが未検証の推測の場合のみ付ける。確認済みなら省略
  stack: '技術スタックの短い説明',
}
```

`liveUrl` が設定されていればカード/メニューはそのURLを開き、未設定(`null`)の場合はこのリポジトリの `apps/<id>` フォルダを開きます。`liveUrl` は絶対URLではなく `gateway/` 配下のパス(`/example/` のような相対パス)にしてください。新しいアプリを追加した場合は `gateway/src/index.ts` の `STATIC_ROUTES`(静的/Viteアプリ)または `PREFIXED_ROUTES`(Next.jsアプリ)にもプレフィックスとデプロイ先ホスト名を追加する必要があります。詳細は `scripts/README.md` の「C. ゲートウェイ」を参照してください。

## 役割ごとのメニューを追加・編集する

`roles-data.js` に2つのデータがあります。

- `window.FEATURES`: 個々の「機能」の定義。`target` に `apps-data.js` の `APPS[].id` を指定するとその機能がどのアプリを開くかを紐付けられます。まだアプリが無い機能は `target: null` にすると、メニュー上で「準備中」表示になります。同じアプリの別タブ/別画面を指す機能が複数あってもよく、その場合は `note` にタブ名などの補足を書きます(例: 「補強カウント」→ `stopwatch` アプリの「補強フル/コアA/…」タブ)。
- `window.ROLES`: 役割の一覧。`features` に上記のキーを表示したい順番で並べます。

```js
// roles-data.js
window.FEATURES.example_feature = { name: '新機能', icon: '📦', target: 'example', note: null };
window.ROLES.find(r => r.id === 'staff').features.push('example_feature');
```

## 現在掲載しているアプリ

すべて `apps/` 以下にモノレポとして取り込み済みで、Cloudflareへのデプロイも
完了しています。`apps-data.js` の `liveUrl` は `gateway/` (リバースプロキシ
Worker)配下のパス(例: `/stopwatch/`)で管理しており、実際にどのアプリが
どのCloudflareプロジェクトに対応するかは `gateway/src/index.ts` の
`STATIC_ROUTES` / `PREFIXED_ROUTES` を参照してください。

| アプリ | カテゴリ | ゲートウェイ配下のパス |
| --- | --- | --- |
| Joy-Con ストップウォッチ / レーシングウォッチ (tokei) | 計測・トレーニング | `/tokei/` |
| ストップウォッチ(タバタ/補強/ストレッチ/山試走/ペース計算/点呼を含む) | 計測・トレーニング | `/stopwatch/` |
| タスク共有 (taskkyoyu) | チーム運営・事務 | `/taskkyoyu/` |
| 寮費・食費清算 (ryouhi) | チーム運営・事務 | `/ryouhi/` |
| 食数管理 (meal_traker) | チーム運営・事務 | `/meal_traker/` |
| 会員ラベル作成 (label_create) | チーム運営・事務 | `/label_create/` |
| メディカルカルテ (tiryou-karte) | メディカル | `/tiryou-karte/` |
| トレーナー知見ライブラリ/青トレデータ (itonomaki) | メディカル | `/itonomaki/` |
| フィジカルカルテ(SPM) (spm-medical-record) | メディカル | `/spm-medical-record/` |

「故障者報告確認」はまだどのアプリにも実装されていない機能のため、メニュー上は「準備中」と表示されます。実装後に `roles-data.js` の `injury_report.target` を設定してください。

## itonomakiについて

旧本番環境 `itonomaki-55ve`(Vercel)から Cloudflare Workers
(`agu-itonomaki.aoyamagakuin-shimoda.workers.dev`)への移行が完了しました。
`src/lib/github.ts` はWeb編集機能(`/edit`)の保存先として旧リポジトリ
`itoaogaku/itonomaki` を直書きしていましたが、このモノレポ
(`AGU-ekiden/AGU_app`、パス `apps/itonomaki/notion_sync/content`)向けに
修正済みです。`stopwatch` のコード内には旧デプロイ(`itonomaki-55ve`)への
URL参照がまだ残っています。写真/音声アップロード・点呼名簿はFTP依存で
現状Cloudflareでは動作しないため実害はありませんが、これらの機能を
復活させる際は新URLへの向き先変更も合わせて必要です。詳細は
`scripts/README.md` の「既知の制限」を参照してください。

## ローカルで確認する(ポータル)

ビルド不要です。`index.html` を直接ブラウザで開くか、簡易サーバーを立てて確認できます。

```bash
npx serve .
# または
python3 -m http.server 8080
```

各アプリを個別に確認する場合は、`apps/<アプリID>/` に移動してそれぞれの `README.md` の手順に従ってください(Vite/Next.js系は `npm install && npm run dev`、静的HTML系はブラウザで直接開くか簡易サーバーでOK)。
