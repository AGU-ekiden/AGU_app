export interface KarteRecord {
  id: string;
  playerId?: string;
  clientName: string;
  trainerName: string;
  location: string;
  chiefComplaint: string;
  physicalCheck: string;
  procedureContent: string;
  trainingContent: string;
  memo: string;
  tags: string[];
  mediaUrls: string[];
  createdAt: string;
}

export interface KarteFormData {
  playerId: string;
  clientName: string;
  trainerName: string;
  location: string;
  chiefComplaint: string;
  physicalCheck: string;
  procedureContent: string;
  trainingContent: string;
  memo: string;
  tags: string[];
  mediaUrls: string[];
  /** 施術日 "YYYY-MM-DD" */
  treatmentDate: string;
}

export interface PlayerInfo {
  id: string;
  name: string;
  grade?: string;
  gender?: string;
  /** 部員DBの「区分」（選手 / OBOG / マネージャー / スタッフ） */
  category?: string;
  karteCount?: number;
  lastKarte?: string | null;
}

export interface ObogPlayerInfo {
  id: string;
  name: string;
  gender?: string;
  /** 生年月日から算出した大学入学年（例: 2021） */
  entranceYear: number;
}

export interface TeamInfo {
  name: string;
  playerCount: number;
}

export interface RaceResult {
  id: string;
  competitionName: string;
  eventName: string;
  date: string;
  result: string;
  rank?: number;
  flags: string[];
  venue: string;
  notes: string;
  category: string;
}

export interface MedicalKarteRecord {
  id: string;
  playerId?: string;
  clientName: string;
  trainerName: string;
  chiefComplaint: string;
  acupuncturePresent: string;
  acupunctureLocation: string;
  treatmentScope: string;
  overallAssessment: string;
  createdAt: string;
}

export interface BloodTestRecord {
  id: string;
  playerId?: string;
  clientName: string;
  testDate: string;
  memo: string;
  values: Record<string, number | null>;
  createdAt: string;
}

export interface PlayerProfile {
  id: string;
  playerId?: string;
  clientName: string;
  existingConditions: string;
  medications: string;
  updatedAt: string;
}

export interface PlayerProfileFormData {
  playerId: string;
  clientName: string;
  existingConditions: string;
  medications: string;
}
