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

## Vercelへのデプロイ(アプリごとに別プロジェクト)

各アプリは**別々のVercelプロジェクト**として、このリポジトリを共通のソースにしつつ `Root Directory` だけを変えてデプロイします。

1. Vercelで「Add New Project」→ このリポジトリ(`AGU-ekiden/AGU_app`)を選択
2. `Root Directory` に対象アプリのパスを指定(下表)
3. `Framework Preset` は基本 `Other`(Vite/Next.jsのアプリは自動検出されるのでそのままでOK)
4. アプリごとに必要な環境変数(GASのURL、Notionトークンなど)を設定
5. プロジェクト名はアプリ名にしておくと分かりやすい(例: `agu-stopwatch`)

| アプリ | Root Directory | Framework Preset |
| --- | --- | --- |
| tokei | `apps/tokei` | Other |
| stopwatch | `apps/stopwatch` | Other |
| taskkyoyu | `apps/taskkyoyu` | Other |
| task | `apps/task` | Other |
| ryouhi | `apps/ryouhi` | Vite(自動検出) |
| meal_traker | `apps/meal_traker` | Other |
| label_create | `apps/label_create` | Vite(自動検出) |
| tiryou-karte | `apps/tiryou-karte` | Next.js(自動検出) |
| itonomaki | `apps/itonomaki/web` | Next.js(自動検出) |
| spm-medical-record | `apps/spm-medical-record` | Next.js(自動検出) |

ポータル自体(ルート直下)は `Root Directory` を空(リポジトリルート)にして、`Other` プリセットでデプロイします。

## アプリを改良する

各アプリのコードは `apps/<アプリID>/` の下にあります。中の `README.md` に元々のセットアップ手順が書かれているので参考にしつつ、通常のコード変更と同じように編集してください。変更後、対応するVercelプロジェクトが自動で再デプロイされます。

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
  rootDir: 'apps/example',  // Vercelの Root Directory と異なる場合のみ指定(itonomakiなど)
  liveUrl: 'https://example.vercel.app', // 未デプロイ/未確認なら null
  urlConfidence: 'guess',  // URLが未検証の推測の場合のみ付ける。確認済みなら省略
  stack: '技術スタックの短い説明',
}
```

`liveUrl` が設定されていればカード/メニューはそのURLを開き、未設定(`null`)の場合はこのリポジトリの `apps/<id>` フォルダを開きます。

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

すべて `apps/` 以下にモノレポとして取り込み済みです。

| アプリ | カテゴリ | デプロイURL |
| --- | --- | --- |
| Joy-Con ストップウォッチ / レーシングウォッチ (tokei) | 計測・トレーニング | https://joycontimer.vercel.app (推定・要確認) |
| ストップウォッチ(タバタ/補強/ストレッチ/山試走/ペース計算/点呼を含む) | 計測・トレーニング | 未確認 |
| タスク共有 (taskkyoyu) | チーム運営・事務 | 未確認 |
| タスク管理 (task) | チーム運営・事務 | https://task-ochre-one-88.vercel.app |
| 寮費・食費清算 (ryouhi) | チーム運営・事務 | 未確認 |
| 食数管理 (meal_traker) | チーム運営・事務 | 未確認 |
| 会員ラベル作成 (label_create) | チーム運営・事務 | https://label-create-alpha.vercel.app |
| メディカルカルテ (tiryou-karte) | メディカル | https://tiryou-karte.vercel.app |
| トレーナー知見ライブラリ/青トレデータ (itonomaki) | メディカル | https://itonomaki-55ve.vercel.app (旧リポジトリのデプロイ。stopwatchのコード内に直書きされていたURL) |
| フィジカルカルテ(SPM) (spm-medical-record) | メディカル | https://spm-medical-record.vercel.app |

「未確認」のアプリは実際のデプロイURLが分かり次第 `apps-data.js` の `liveUrl` を埋めてください。`tokei` の URL は同名アプリ("Joy-Con Stopwatch")のものと推測していますが未検証のため、確認後は `urlConfidence: 'guess'` の行を削除してください。

「故障者報告確認」はまだどのアプリにも実装されていない機能のため、メニュー上は「準備中」と表示されます。実装後に `roles-data.js` の `injury_report.target` を設定してください。

## Vercelプロジェクトの一括作成

`scripts/setup_vercel.py` でアプリごとのVercelプロジェクト作成・Root Directory
設定・環境変数投入を自動化できます。手順は `scripts/README.md` を参照してくだ
さい。

### itonomakiは既存プロジェクトを繋ぎ直す

`itonomaki-55ve` が本番で稼働中の実体で、`stopwatch` のコードにもこのURLが
直書きされています。そのため `itonomaki` だけは新規Vercelプロジェクトを
作らず、既存の `itonomaki-55ve` プロジェクトのGit連携をこのリポジトリに
張り替える方式にしています(URL・既存の環境変数を維持するため)。手順は
`scripts/README.md` の「itonomaki: 既存プロジェクトの繋ぎ直し」を参照して
ください。この方式なら `stopwatch` 側の修正は不要です。

`src/lib/github.ts` はWeb編集機能(`/edit`)の保存先として旧リポジトリ
`itoaogaku/itonomaki` を直書きしていましたが、このモノレポ
(`AGU-ekiden/AGU_app`、パス `apps/itonomaki/notion_sync/content`)向けに
修正済みです。

## ローカルで確認する(ポータル)

ビルド不要です。`index.html` を直接ブラウザで開くか、簡易サーバーを立てて確認できます。

```bash
npx serve .
# または
python3 -m http.server 8080
```

各アプリを個別に確認する場合は、`apps/<アプリID>/` に移動してそれぞれの `README.md` の手順に従ってください(Vite/Next.js系は `npm install && npm run dev`、静的HTML系はブラウザで直接開くか簡易サーバーでOK)。
