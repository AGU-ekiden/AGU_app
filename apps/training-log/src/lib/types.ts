export const MENU_TYPES = [
  "朝練Jog",
  "午後Jog",
  "ペース走",
  "インターバル",
  "距離走",
  "補強",
  "その他",
] as const;

export type MenuType = (typeof MENU_TYPES)[number];

export const BODY_PART_TAGS = [
  "なし",
  "右アキレス腱",
  "左アキレス腱",
  "右ハムストリング",
  "左ハムストリング",
  "右膝",
  "左膝",
  "腰",
  "股関節",
  "足底",
  "その他",
] as const;

export interface Player {
  id: string;
  name: string;
  notionMemberPageId: string | null;
}

export interface StravaLap {
  lapIndex: number;
  distanceMeters: number;
  movingTimeSec: number;
  avgHeartRate: number | null;
}

export interface StravaActivitySummary {
  id: number;
  name: string;
  startDateLocal: string;
  distanceKm: number;
  movingTimeSec: number;
  avgPaceSecPerKm: number | null;
  avgHeartRate: number | null;
  stravaUrl: string;
  laps: StravaLap[];
}

export interface ActivityForJournal {
  stravaActivityId: number;
  distanceKm: number;
  durationSec: number;
  avgPaceSecPerKm: number | null;
  avgHeartRate: number | null;
  stravaUrl: string;
}

export interface JournalSubmission {
  playerId: string;
  playerName: string;
  date: string;
  menuType: MenuType;
  rpe: number;
  bodyParts: string[];
  sleepHours: number | null;
  weightKg: number | null;
  notes: string;
  activity: ActivityForJournal | null;
}
