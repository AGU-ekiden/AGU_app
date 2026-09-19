export type PracticeStatus = "pass" | "fail" | "unclassified";

/** Dropbox上のフォルダ名（男子練習結果/女子練習結果/合宿）から判定する所属区分。
 *  いずれにも一致しない場合は "other"（バッジ非表示）になる。 */
export type PracticeTeam = "male" | "female" | "camp" | "other";

/** どのDropboxフォルダから取得したデータかを表す区分。
 *  練習結果フォルダ（DROPBOX_FOLDER_PATH）は "practice"、
 *  試合結果フォルダ（DROPBOX_MATCH_FOLDER_PATH）は "match_tt" 固定。 */
export type PracticeTag = "practice" | "match_tt";

export interface PracticeResult {
  /** Dropboxのファイルパスをbase64urlエンコードした識別子 */
  id: string;
  /** Dropbox上のファイル名（拡張子込み） */
  name: string;
  /** ファイル名から日付・ステータス表記を取り除いた表示用タイトル */
  title: string;
  /** Dropbox上のフルパス */
  path: string;
  /** バイト単位のファイルサイズ */
  size: number;
  /** Dropbox上の更新日時（ISO 8601） */
  modifiedAt: string;
  /** 練習日（ファイル名から抽出、無ければ更新日で代用） */
  practiceDate: string;
  status: PracticeStatus;
  team: PracticeTeam;
  tag: PracticeTag;
}

export type SortField = "date" | "name";
export type SortOrder = "asc" | "desc";
