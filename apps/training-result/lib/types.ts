export type PracticeStatus = "pass" | "fail" | "unclassified";

/** Dropbox上のフォルダ名（男子練習結果/女子練習結果/合宿）から判定する所属区分 */
export type PracticeTeam = "male" | "female" | "camp";

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
}

export type SortField = "date" | "name";
export type SortOrder = "asc" | "desc";
