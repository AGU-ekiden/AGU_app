# メディカルカルテシステム

青山学院大学陸上部向けメディカルトレーナーカルテシステム。

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
| `NOTION_MEMBERS_DATABASE_ID` | 部員DB（選手一覧の取得元） |
| `NOTION_MEDICAL_KARTE_DATABASE_ID` | メディカルカルテDB（本アプリのカルテ保存先） |
| `NOTION_RACE_RESULTS_DATABASE_ID` | 競技結果DB（選手ページのカレンダー・ログに大会結果を統合表示） |
| `NOTION_PERSONAL_KARTE_DATABASE_ID` | SPM カルテ記録（既存のフィジカルカルテ。選手ページのカレンダー・ログにパーソナルカルテを統合表示） |
| `NOTION_BLOOD_TEST_DATABASE_ID` | 血液検査DB（貧血・疲労・脱水・疲労骨折・ホルモン関連の全38項目を記録。選手ページのカレンダー・ログに統合表示） |
| `NOTION_PLAYER_PROFILE_DATABASE_ID` | 選手プロフィールDB（既往歴・服用している薬。選手ごとに1件、常に最新の内容に上書き保存） |
| `NOTION_INBODY_DATABASE_ID` | InBody記録DB（体重・骨格筋量・体脂肪量・体脂肪率・BMI・内臓脂肪レベル。選手ページのカレンダー・ログに統合表示） |

いずれのDBも部員DBへのリレーションで紐づいており、そのリレーションを使って選手ごとのレコードを横断的に取得しています（プロパティ名は「部員」、競技結果DBは「選手名」、選手プロフィールDBのみ「部員DB」）。

## 血液検査項目

血液検査DBの各項目・基準値（性別ごと）・説明は `src/lib/bloodTestItems.ts` に定義しています。項目や基準値を変更する場合はこのファイルと、Notion側の血液検査DBのプロパティ名を一致させてください。

## 選手プロフィール

血液検査・InBody・大会結果・パーソナルカルテとは異なり、選手プロフィール（既往歴・服用している薬）は時系列のログではなく、選手ごとに1件のみ存在し、保存するたびに既存の内容を上書き更新します（Notion DB上も1選手1ページ）。
