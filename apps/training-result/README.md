# 練習結果ビューア

Dropboxに保存された練習結果（PDF）を一覧・詳細で閲覧できるWebアプリです。

- フロントエンド: Next.js (App Router) + TypeScript + Tailwind CSS
- バックエンド: Next.js Route Handlers（`app/api/dropbox/*`）
- データソース: Dropbox API（`dropbox` 公式SDK）

## セットアップ

```bash
npm install
cp .env.example .env.local
```

`.env.local` にDropboxの認証情報とフォルダパスを設定してください（詳細は `.env.example` のコメントを参照）。

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開くと一覧画面が表示されます。

## フォルダ構成

```
app/
  page.tsx                 一覧画面（トップページ）
  results/[id]/page.tsx    詳細画面（PDFビューア）
  api/dropbox/list/route.ts  Dropboxフォルダ内のPDF一覧を取得するAPI
  api/dropbox/file/route.ts  指定したPDFをDropboxからプロキシ配信するAPI
components/
  ResultsList.tsx   一覧のデータ取得・状態管理
  FilterBar.tsx     検索・ステータス絞り込み・並び替えUI
  ResultCard.tsx    一覧の1件分のカード
  StatusBadge.tsx   ステータス（合格/不合格/未分類）バッジ
  PdfViewer.tsx     詳細画面のPDF埋め込み表示
lib/
  dropbox.ts            Dropboxクライアントの生成（サーバー専用）
  practice-results.ts   Dropbox上のPDFを一覧・パスに変換するロジック
  types.ts               共有の型定義
  format.ts               日時・ファイルサイズの表示用フォーマッタ
```

## ステータス・練習日の判定について

Dropbox上のファイル名から以下のように情報を抽出します（該当しない場合は「未分類」扱いになります）。

- 練習日: ファイル名中の `YYYY-MM-DD` 形式のトークン（例: `2026-09-01_合格_柔道乱取り.pdf`）
- ステータス: `合格` / `不合格` / `OK` / `NG` などのキーワード（`lib/practice-results.ts` の `STATUS_KEYWORDS` で定義）

日付が見つからない場合はDropbox上の更新日時を練習日として代用します。命名規則が異なる場合は `lib/practice-results.ts` の `parseNameMeta` を調整してください。

## セキュリティについて

- Dropboxのアクセストークン・認証情報はすべて環境変数（`.env.local`）で管理し、クライアントには一切送信していません。
- PDFの実体は `app/api/dropbox/file/route.ts` がサーバー側でDropboxからダウンロードし、そのままプロキシ配信します。
- 配信対象のパスは `DROPBOX_FOLDER_PATH` 配下のPDFファイルのみに制限しています（パストラバーサル対策）。
