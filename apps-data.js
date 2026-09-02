// AGU_app ポータルに掲載するアプリの一覧。
//
// このリポジトリはモノレポ構成で、各アプリの実体は apps/<id>/ 以下に
// コピーされている(元のリポジトリとは切り離し済み。以後の改良はこの
// リポジトリの apps/<id>/ で行う)。デプロイ先はVercel(全アプリ共通)。
// ルートの vercel.json の rewrites で各アプリを1オリジンに束ねている。
// 詳細は scripts/README.md 参照。
//
// 新しいアプリを追加するときは、apps/<id>/ にコードを置いた上で、この
// 配列にオブジェクトを1つ足してください。
//
// id:          一意なID(英数字)。apps/<id>/ ディレクトリ名と一致させる。
//               roles-data.js の feature からもこのIDで参照される
// name:        表示名
// description: 1〜2行の説明
// category:    "measure" | "ops" | "medical" のいずれか(下の CATEGORIES に対応)
// icon:        絵文字アイコン
// repoUrl:     コード参照先URL(通常はこのリポジトリの apps/<id> フォルダ)
// rootDir:     デプロイ設定のRoot Directoryに指定するパス。省略時は `apps/<id>` と同じ
//               (itonomakiのみ apps/itonomaki/web)
// liveUrl:     デプロイ済みアプリのURL。未確認/未デプロイの場合は null にしておく
// urlConfidence: "guess"(推定、要確認) | undefined(確認済みとして扱う)
// stack:       技術スタックの短い説明
const REPO_TREE = 'https://github.com/AGU-ekiden/AGU_app/tree/main';

window.CATEGORIES = [
  { id: 'measure', name: '⏱️ 計測・トレーニング' },
  { id: 'ops', name: '📋 チーム運営・事務' },
  { id: 'medical', name: '🩺 メディカル' },
];

window.APPS = [
  {
    id: 'tokei',
    name: 'Joy-Con ストップウォッチ',
    description: 'シンプルな計測ダッシュボード。練習タイムの計測に使う時計アプリ。',
    category: 'measure',
    icon: '⏱️',
    repoUrl: `${REPO_TREE}/apps/tokei`,
    liveUrl: '/tokei/',
    stack: '静的HTML(単一ファイル)',
  },
  {
    id: 'stopwatch',
    name: 'ストップウォッチ',
    description: 'A/B 2系列のラップ計測、距離・ペース計算、山試走の踏切安全チェック、ストレッチ/補強タイマー、TABATA、点呼機能まで備えた多機能計測アプリ。',
    category: 'measure',
    icon: '⏲️',
    repoUrl: `${REPO_TREE}/apps/stopwatch`,
    liveUrl: '/stopwatch/',
    stack: 'Vanilla JS / PWA',
  },
  {
    id: 'taskkyoyu',
    name: 'タスク共有',
    description: 'スマホ最適化のタスク管理アプリ。優先度バッジ・@タグでの確認先指定・LINE確認メモに対応。',
    category: 'ops',
    icon: '✅',
    repoUrl: `${REPO_TREE}/apps/taskkyoyu`,
    liveUrl: '/taskkyoyu/',
    stack: 'Vanilla JS + GAS(スプレッドシートDB)',
  },
  {
    id: 'ryouhi',
    name: '寮費・食費清算',
    description: '寮生の会費・食費の月次清算管理システム。集金用PDFの一括出力に対応。',
    category: 'ops',
    icon: '🧾',
    repoUrl: `${REPO_TREE}/apps/ryouhi`,
    liveUrl: '/ryouhi/',
    stack: 'React (Vite) + Tailwind + GAS',
  },
  {
    id: 'meal_traker',
    name: '食数管理',
    description: '寮の朝食・夕食の喫食数を記録するアプリ。',
    category: 'ops',
    icon: '🍚',
    repoUrl: `${REPO_TREE}/apps/meal_traker`,
    liveUrl: '/meal_traker/',
    stack: '静的HTML(単一ファイル)',
  },
  {
    id: 'label_create',
    name: '会員ラベル作成',
    description: '会員データから印刷用の宛名ラベルシートを作成するアプリ。データはサーバーに送信せずブラウザ内で処理。',
    category: 'ops',
    icon: '🏷️',
    repoUrl: `${REPO_TREE}/apps/label_create`,
    liveUrl: '/label_create/',
    stack: 'React (Vite) + TypeScript',
  },
  {
    id: 'tiryou-karte',
    name: 'メディカルカルテ',
    description: '陸上部向けメディカルトレーナーカルテシステム。血液検査・InBody・大会結果などを選手ごとに横断表示。',
    category: 'medical',
    icon: '🩺',
    repoUrl: `${REPO_TREE}/apps/tiryou-karte`,
    liveUrl: '/tiryou-karte/',
    stack: 'Next.js + Notion API',
  },
  {
    id: 'itonomaki',
    name: 'トレーナー知見ライブラリ(青トレデータ)',
    description: 'フィジカル・メンタル・部位別・種目別・トレーナーの知見をまとめた閲覧用サイト。Notionと同期。',
    category: 'medical',
    icon: '📚',
    repoUrl: `${REPO_TREE}/apps/itonomaki`,
    rootDir: 'apps/itonomaki/web',
    liveUrl: '/itonomaki/',
    stack: 'Next.js + Notion同期(Python)',
  },
  {
    id: 'spm-medical-record',
    name: 'フィジカルカルテ(SPM)',
    description: 'フィジカルトレーナーがフィジカルカルテを記録するアプリ。記録内容は tiryou-karte の選手ページにも統合表示される。',
    category: 'medical',
    icon: '💊',
    repoUrl: `${REPO_TREE}/apps/spm-medical-record`,
    liveUrl: '/spm-medical-record/',
    stack: 'Next.js + Notion API',
  },
  {
    id: 'keihi-seisan',
    name: '経費精算',
    description: 'クレジットカード明細から経費精算PDF・出張報告書を作成するアプリ。サーバー側にDBを持たず、各自のGoogleスプレッドシートに保存する。',
    category: 'ops',
    icon: '💳',
    repoUrl: `${REPO_TREE}/apps/keihi-seisan`,
    liveUrl: '/keihi-seisan/',
    stack: 'Next.js + GAS(各自のスプレッドシート)',
  },
  {
    id: 'training-result',
    name: '練習結果ビューア',
    description: 'Dropboxに保存された練習結果(合格/不合格などのPDF)を一覧・検索・詳細閲覧できるアプリ。',
    category: 'measure',
    icon: '📄',
    repoUrl: `${REPO_TREE}/apps/training-result`,
    liveUrl: '/training-result/',
    stack: 'Next.js + Dropbox API',
  },
];
