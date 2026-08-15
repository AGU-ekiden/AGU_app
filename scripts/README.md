# Vercel セットアップスクリプト

`apps/` 以下の各アプリを、それぞれ別のVercelプロジェクトとして一括作成し、
Root Directory と環境変数を設定するスクリプトです。

## 事前準備

1. **Vercelトークンを発行する**
   Vercelダッシュボード → Settings → Tokens → 「Create Token」
2. **(チーム/Organizationアカウントの場合のみ) Team IDを確認する**
   Vercelダッシュボード → Settings → General に表示されている `Team ID`
3. **GitHub連携を1回済ませておく**
   Vercelでこのリポジトリ(`AGU-ekiden/AGU_app`)を選んで手動でプロジェクトを1つ
   作成すると、Vercel側にGitHub Appの権限が設定される。以降はスクリプトからの
   自動作成も通るようになる(未連携のままだと `gitRepository` 指定でのプロジェ
   クト作成がエラーになることがある)。
4. **秘密の環境変数を用意する**
   ```bash
   cp .env.vercel.local.example .env.vercel.local
   # .env.vercel.local を実際の値で埋める(このファイルはコミットされない)
   ```

## 実行

```bash
export VERCEL_TOKEN=xxxxxxxxxxxxxxxx
export VERCEL_TEAM_ID=team_xxxxxxxx   # チームアカウントの場合のみ

# まずは --dry-run で内容を確認(実際のAPI呼び出しはしない)
python3 scripts/setup_vercel.py --dry-run

# 問題なければ実行
python3 scripts/setup_vercel.py

# 一部のアプリだけ実行したい場合
python3 scripts/setup_vercel.py --only ryouhi,tiryou-karte
```

アプリIDは `scripts/vercel-apps.json` の `id` を参照(`portal`, `tokei`,
`stopwatch`, `taskkyoyu`, `task`, `ryouhi`, `meal_traker`, `label_create`,
`tiryou-karte`, `itonomaki`, `spm-medical-record`)。

## スクリプトがやること

`itonomaki` を除く各アプリについて:

1. 同名のVercelプロジェクトが無ければ、このリポジトリと連携した状態で新規作成
2. `Root Directory` を `apps/<アプリID>` に設定
3. `.env.vercel.local` に値があるキーだけ、Production/Preview/Development 全環境に環境変数として登録
4. 値が無かったキー・既に登録済みのキーはスキップし、最後に一覧表示

**上書きはしません**。既にVercel側に同名の環境変数がある場合はスキップされる
ので、誤って既存の値を消すことはありません。値を更新したい場合はVercelダッシュ
ボードから直接編集してください。

`itonomaki` は既に本番稼働中の既存プロジェクト(`itonomaki-55ve`)があるため、
このスクリプトは自動でスキップします(`vercel-apps.json` の `skipAutoCreate`)。
新しいプロジェクトを作らず、既存プロジェクトを繋ぎ直す方法は下記参照。

## 実行後にやること

- スクリプト実行後に表示される「未設定の環境変数」一覧を確認し、必要なもの
  (特に tiryou-karte・spm-medical-record の Notion系は必須)をVercelダッシュ
  ボードから追加する
- 各プロジェクトのデプロイが成功したら、`apps-data.js` の該当アプリの `liveUrl`
  を実際のURLに更新する

## itonomaki: 既存プロジェクトの繋ぎ直し(このスクリプトでは行いません)

`itonomaki-55ve` は既に本番で使われており、URLが `stopwatch` のコードにも
直書きされているため、新規プロジェクトを作るのではなく**既存プロジェクトの
Git連携を張り替える**方法を取ります。これならURLは変わらず、既存の環境変数
(`GITHUB_TOKEN`・`FTP_*` 等)もそのまま使えます。

1. Vercelダッシュボードで `itonomaki-55ve` プロジェクトを開く
2. **Settings → Git** → 現在連携しているリポジトリの連携を解除し、
   `AGU-ekiden/AGU_app` を新たに連携する
3. **Settings → General → Root Directory** を `apps/itonomaki/web` に変更
4. **Settings → Environment Variables** で既存の値がそのまま残っていることを確認
   (消えていた場合のみ `scripts/vercel-apps.json` の `itonomaki` の項目を参照して再設定)
5. Deploy し、`/edit` を含めて動作確認する

上記の作業を行う前提で、`apps/itonomaki/web/src/lib/github.ts` は既に
`AGU-ekiden/AGU_app` (`apps/itonomaki/notion_sync/content`) 向けに修正済みです
(以前のコミットで対応済み)。`stopwatch` 側のURLもこの方法なら変更不要です。
