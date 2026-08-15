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

各アプリについて:

1. 同名のVercelプロジェクトが無ければ、このリポジトリと連携した状態で新規作成
2. `Root Directory` を `apps/<アプリID>`(itonomakiのみ `apps/itonomaki/web`)に設定
3. `.env.vercel.local` に値があるキーだけ、Production/Preview/Development 全環境に環境変数として登録
4. 値が無かったキー・既に登録済みのキーはスキップし、最後に一覧表示

**上書きはしません**。既にVercel側に同名の環境変数がある場合はスキップされる
ので、誤って既存の値を消すことはありません。値を更新したい場合はVercelダッシュ
ボードから直接編集してください。

## 実行後にやること

- スクリプト実行後に表示される「未設定の環境変数」一覧を確認し、必要なもの
  (特に tiryou-karte・spm-medical-record の Notion系は必須)をVercelダッシュ
  ボードから追加する
- 各プロジェクトのデプロイが成功したら、`apps-data.js` の該当アプリの `liveUrl`
  を実際のURLに更新する
- `itonomaki` は `src/lib/github.ts` の `OWNER`/`REPO`/`CONTENT_PREFIX` が旧リポ
  ジトリ(`itoaogaku/itonomaki`)を指したままなので、Web編集機能(`/edit`)を使う
  前にこのリポジトリ向け(`AGU-ekiden/AGU_app`、パス `apps/itonomaki/notion_sync/content`)
  に修正が必要
- `stopwatch` は `app.js` 内で itonomaki の共有API URL
  (`https://itonomaki-55ve.vercel.app/...`)を直接ハードコードしているので、
  itonomakiを新しいプロジェクトとして再デプロイする場合はそのURLも合わせて
  更新する
