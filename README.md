# AGU_app — チームアプリ ポータル

AGU駅伝部でこれまで作ってきた各種アプリ(タスク管理・寮費清算・メディカルカルテなど)への入り口をひとつにまとめたポータルサイトです。ビルド不要の静的サイトで、Vercel にそのままデプロイできます。

## 構成

- `index.html` / `style.css` / `script.js` — ポータル本体
- `apps-data.js` — 掲載するアプリの一覧データ

各アプリの実体(コード)はこのリポジトリには含まれていません。それぞれ別リポジトリで管理されているアプリへ、カードからリンクする形の「ハブ」です。

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
  stack: '技術スタックの短い説明',
}
```

`liveUrl` が設定されていればカードはそのURLを開き、未設定(`null`)の場合は GitHub リポジトリを開きます。

## 現在掲載しているアプリ

| アプリ | カテゴリ | デプロイURL |
| --- | --- | --- |
| Joy-Con ストップウォッチ (tokei) | 計測・トレーニング | 未確認 |
| ストップウォッチ | 計測・トレーニング | 未確認 |
| タスク共有 (taskkyoyu) | チーム運営・事務 | 未確認 |
| タスク管理 (task) | チーム運営・事務 | https://task-ochre-one-88.vercel.app |
| 寮費・食費清算 (ryouhi) | チーム運営・事務 | 未確認 |
| 食数管理 (meal_traker) | チーム運営・事務 | 未確認 |
| 会員ラベル作成 (label_create) | チーム運営・事務 | https://label-create-alpha.vercel.app |
| メディカルカルテ (tiryou-karte) | メディカル | https://tiryou-karte.vercel.app |
| トレーナー知見ライブラリ (itonomaki) | メディカル | 未確認 |

「未確認」のアプリは実際のデプロイURLが分かり次第 `apps-data.js` の `liveUrl` を埋めてください。

## ローカルで確認する

ビルド不要です。`index.html` を直接ブラウザで開くか、簡易サーバーを立てて確認できます。

```bash
npx serve .
# または
python3 -m http.server 8080
```

## デプロイ

Vercel に接続すれば `vercel.json` の設定でそのまま静的サイトとして配信されます。
