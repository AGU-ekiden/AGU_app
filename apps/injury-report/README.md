# 故障者報告

青山学院大学陸上部向け 故障者報告アプリ。毎週金曜日、ポイント練習（高強度練習）を行っていない選手が、故障の状況を自己申告する。時系列ログとして毎週新規レコードを追加していく方式。

## セットアップ

```bash
npm install
cp .env.local.example .env.local
# .env.local に必要な値を設定して npm run dev
```

## 環境変数

| 変数名 | 用途 |
| --- | --- |
| `NOTION_TOKEN` | Notion インテグレーションのシークレットトークン |
| `NOTION_MEMBERS_DATABASE_ID` | 部員DB（選手一覧の取得元。他アプリと共通） |
| `NOTION_INJURY_REPORT_DATABASE_ID` | 故障者報告DB（本アプリの報告の保存先） |

## 画面

- `/` : 選手本人による報告フォーム。ポータルのログイン情報（`localStorage` の `agu_portal_auth`）から氏名を読み取り、部員DBと突き合わせて本人を特定するため、選手を選択する操作は不要。
- `/dashboard/` : トレーナー・マネージャー向け一覧。直近の報告がある選手を、ステージが重い順に並べて表示する。
- `/player/[playerId]/` : 選手ごとの報告履歴（全件）。

## データ項目

- 故障者入りした日
- 痛みのある個所（Notion側のMulti-selectで管理。増減はNotion側で行う）
- 今日時点の故障個所のステージ（0:ノーラン 〜 5:ポイント合流・復帰）
- 今週の走行距離
- ポイント合流した日

## デプロイ

ポータル（リポジトリルート）の `vercel.json` の `/injury-report/` rewrite からこのプロジェクトへプロキシされる。ポータル側から見えるURLは `https://<ポータルのドメイン>/injury-report/`。
