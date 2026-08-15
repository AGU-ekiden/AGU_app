# AGU_app — チームアプリ ポータル

AGU駅伝部でこれまで作ってきた各種アプリ(タスク管理・寮費清算・メディカルカルテなど)への入り口をひとつにまとめたポータルサイトです。ビルド不要の静的サイトで、Vercel にそのままデプロイできます。

初回アクセス時に「選手 / マネージャー / スタッフ / メディカルトレーナー / フィジカルトレーナー」から役割を選ぶと、その役割用のメニュー(よく使う機能への直リンク)が表示されます。選択はブラウザに保存され、次回からは自動でそのメニューが開きます。「すべてのアプリ」からはアプリ単位の一覧(カテゴリ別)も見られます。

## 構成

- `index.html` / `style.css` / `script.js` — ポータル本体
- `apps-data.js` — 掲載するアプリの一覧データ
- `roles-data.js` — 役割ごとのメニュー(機能一覧)データ

各アプリの実体(コード)はこのリポジトリには含まれていません。それぞれ別リポジトリで管理されているアプリへ、カード/メニュー項目からリンクする形の「ハブ」です。

## アプリを追加・編集する

`apps-data.js` の `window.APPS` 配列にオブジェクトを1つ追加(または編集)するだけです。

```js
{
  id: 'example',
  name: '表示名',
  description: '1〜2行の説明',
  category: 'ops', // 'measure' | 'ops' | 'medical'
  icon: '📦',
  repoUrl: 'https://github.com/AGU-ekiden/example',
  liveUrl: 'https://example.vercel.app', // 未デプロイ/未確認なら null
  urlConfidence: 'guess', // URLが未検証の推測の場合のみ付ける。確認済みなら省略
  stack: '技術スタックの短い説明',
}
```

`liveUrl` が設定されていればカード/メニューはそのURLを開き、未設定(`null`)の場合は GitHub リポジトリを開きます。

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
| トレーナー知見ライブラリ/青トレデータ (itonomaki) | メディカル | 未確認 |
| フィジカルカルテ(SPM) (spm-medical-record) | メディカル | https://spm-medical-record.vercel.app |

「未確認」のアプリは実際のデプロイURLが分かり次第 `apps-data.js` の `liveUrl` を埋めてください。`tokei` の URL は同名アプリ("Joy-Con Stopwatch")のものと推測していますが未検証のため、確認後は `urlConfidence: 'guess'` の行を削除してください。

「故障者報告確認」はまだどのアプリにも実装されていない機能のため、メニュー上は「準備中」と表示されます。実装後に `roles-data.js` の `injury_report.target` を設定してください。

## ローカルで確認する

ビルド不要です。`index.html` を直接ブラウザで開くか、簡易サーバーを立てて確認できます。

```bash
npx serve .
# または
python3 -m http.server 8080
```

## デプロイ

Vercel に接続すれば `vercel.json` の設定でそのまま静的サイトとして配信されます。
