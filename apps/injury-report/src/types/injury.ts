export const STAGE_OPTIONS = [
  "0:ノーラン",
  "1:ランウォーク",
  "2:20分JOG以下",
  "3:40分以下のJOG",
  "4:60分以下のJOG",
  "5:ポイント合流・復帰",
] as const;

export type InjuryStage = (typeof STAGE_OPTIONS)[number];

export function stageNumber(stage: string): number | null {
  const match = stage.match(/^(\d+):/);
  return match ? Number(match[1]) : null;
}

// 部位リストはNotion側のMulti-selectで管理しているので、ここでは
// 新規作成フォームの初期候補としてだけ保持する(増減はNotion側で行う)。
export const PAIN_LOCATION_OPTIONS = ["右シンスプリント"];

export interface PlayerInfo {
  id: string;
  name: string;
  grade?: string;
}

export interface InjuryReportRecord {
  id: string;
  playerId?: string;
  playerName: string;
  reportDate: string;
  injuryStartDate: string;
  painLocations: string[];
  stage: string;
  weeklyDistance?: number;
  pointRejoinDate: string;
  createdAt: string;
}

export interface InjuryReportFormData {
  playerId: string;
  playerName: string;
  reportDate: string;
  injuryStartDate: string;
  painLocations: string[];
  stage: InjuryStage;
  weeklyDistance?: number;
  pointRejoinDate?: string;
}
