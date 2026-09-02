// 役割(ロール)ごとのメニュー構成。
//
// FEATURES: 個別の「機能」の一覧。複数の機能が同じアプリの別タブ/別画面を指すこともある。
//   name:   表示名
//   icon:   絵文字アイコン
//   target: apps-data.js の APPS[].id への参照。まだアプリが無い機能は null にする
//   note:   アプリ内のどの画面/タブを指すかの補足(無ければ null)
//   hash:   指定するとリンクURLの末尾に #hash を付ける(stopwatchアプリの
//           URLハッシュによるタブ直リンクに対応。apps/stopwatch/app.js 参照)
//
// ROLES: 役割の一覧。features は上記 FEATURES のキーを、表示したい順番で並べた配列。
window.FEATURES = {
  stopwatch_main: { name: 'ストップウォッチ', icon: '⏱️', target: 'stopwatch', hash: 'timer', note: null },
  tabata: { name: 'タバタ', icon: '🔥', target: 'stopwatch', hash: 'tabata', note: '「TABATA」タブ' },
  reinforce: { name: '補強カウント', icon: '💪', target: 'stopwatch', hash: 'reinforceFull', note: '「補強フル」タブを開く(コアA/コアB/ループ/下肢はアプリ内メニューから切替)' },
  stretch: { name: 'ストレッチ', icon: '🧘', target: 'stopwatch', hash: 'stretch', note: '「ストレッチ」タブ' },
  pace: { name: 'ペース計算', icon: '📏', target: 'stopwatch', hash: 'pace', note: '「距離」タブ' },
  crossing: { name: '山試走', icon: '⛰️', target: 'stopwatch', hash: 'crossing', note: '「山試走」タブ' },
  rollcall: { name: '点呼', icon: '🙋', target: 'stopwatch', hash: 'rollcall', note: '「点呼」タブ' },
  racing_watch: { name: 'レーシングウォッチ', icon: '📷', target: 'tokei', note: 'カメラ同期ストップウォッチ' },
  aotore: { name: '青トレデータフォルダ', icon: '📚', target: 'itonomaki', note: null },
  blood: { name: '血液検査確認', icon: '🩸', target: 'tiryou-karte', note: null },
  race_result: { name: '試合結果確認', icon: '🏁', target: 'tiryou-karte', note: null },
  ryouhi: { name: '寮費', icon: '🧾', target: 'ryouhi', note: null },
  meal_count: { name: '寮食数計算', icon: '🍚', target: 'meal_traker', note: null },
  label: { name: 'ラベル製作', icon: '🏷️', target: 'label_create', note: null },
  task_manage: { name: 'タスク管理', icon: '✅', target: 'taskkyoyu', note: null },
  medical_karte_input: { name: 'メディカルカルテ打ち込み', icon: '🩺', target: 'tiryou-karte', note: null },
  medical_karte_view: { name: 'メディカルカルテ確認', icon: '🩺', target: 'tiryou-karte', note: null },
  physical_karte_input: { name: 'フィジカルカルテ打ち込み', icon: '💊', target: 'spm-medical-record', note: null },
  physical_karte_view: { name: 'フィジカルカルテ確認', icon: '💊', target: 'tiryou-karte', note: null },
  injury_report: { name: '故障者報告確認', icon: '🚑', target: null, note: '未構築(今後追加予定)' },
  keihi: { name: '経費精算', icon: '💳', target: 'keihi-seisan', note: null },
  training_result: { name: '練習結果', icon: '📄', target: 'training-result', note: null },
  training_log: { name: '練習日誌', icon: '📝', target: 'training-log', note: null },
};

window.ROLES = [
  {
    id: 'athlete',
    name: '選手',
    icon: '🏃',
    features: ['training_log', 'tabata', 'reinforce', 'stretch', 'pace', 'aotore', 'blood', 'race_result', 'training_result'],
  },
  {
    id: 'manager',
    name: 'マネージャー',
    icon: '📋',
    features: [
      'stopwatch_main', 'tabata', 'rollcall', 'reinforce', 'stretch', 'crossing',
      'pace', 'aotore', 'ryouhi', 'injury_report', 'blood', 'race_result',
      'training_result', 'training_log', 'label', 'racing_watch',
    ],
  },
  {
    id: 'staff',
    name: 'スタッフ',
    icon: '🗂️',
    features: [
      'reinforce', 'stopwatch_main', 'rollcall', 'tabata', 'stretch',
      'physical_karte_view', 'medical_karte_view', 'crossing', 'pace', 'aotore',
      'ryouhi', 'task_manage', 'injury_report', 'blood', 'race_result',
      'training_result', 'training_log', 'label', 'racing_watch', 'meal_count', 'keihi',
    ],
  },
  {
    id: 'medical_trainer',
    name: 'メディカルトレーナー',
    icon: '🩺',
    features: ['medical_karte_input', 'physical_karte_view', 'medical_karte_view', 'injury_report', 'blood', 'training_result'],
  },
  {
    id: 'physical_trainer',
    name: 'フィジカルトレーナー',
    icon: '💊',
    features: ['physical_karte_input', 'physical_karte_view', 'medical_karte_view', 'injury_report', 'blood', 'training_result'],
  },
];
