import { Client } from "@notionhq/client";
import { JournalSubmission } from "@/lib/types";

// @notionhq/client はデフォルトで node-fetch を使うが、Cloudflare Workers等の
// 互換レイヤーで壊れることがあるため、標準の globalThis.fetch を明示的に渡す。
// (このリポジトリの他のNotion連携アプリと同じ対策。Vercel Node.jsランタイムでは
// 消す必要は無いので消さないこと)
const notion = new Client({ auth: process.env.NOTION_TOKEN, fetch: globalThis.fetch });

const DATABASE_ID = process.env.NOTION_TRAINING_LOG_DATABASE_ID!;
const MEMBERS_DATABASE_ID = process.env.NOTION_MEMBERS_DATABASE_ID;

function richText(value: string) {
  return [{ text: { content: value } }];
}

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, "0")}"/km`;
}

// 選手を部員マスタDBに紐付ける場合のみ「部員」relationを付与する。
// (NOTION_MEMBERS_DATABASE_ID未設定、または選手にNotionページIDが無い場合は省略)
export async function createJournalEntry(
  data: JournalSubmission,
  memberPageId: string | null
) {
  const properties: Record<string, unknown> = {
    "選手名": { title: richText(data.playerName) },
    "日付": { date: { start: data.date } },
    "メニュー種別": { select: { name: data.menuType } },
    "RPE": { number: data.rpe },
    "違和感部位": { multi_select: data.bodyParts.map((tag) => ({ name: tag })) },
    "睡眠時間": data.sleepHours != null ? { number: data.sleepHours } : { number: null },
    "体重": data.weightKg != null ? { number: data.weightKg } : { number: null },
    "日誌本文": { rich_text: richText(data.notes) },
  };

  if (data.activity) {
    properties["走行距離(km)"] = { number: data.activity.distanceKm };
    properties["所要時間"] = { rich_text: richText(formatDuration(data.activity.durationSec)) };
    properties["平均ペース"] = {
      rich_text: richText(
        data.activity.avgPaceSecPerKm != null ? formatPace(data.activity.avgPaceSecPerKm) : ""
      ),
    };
    properties["平均心拍"] =
      data.activity.avgHeartRate != null ? { number: data.activity.avgHeartRate } : { number: null };
    properties["Strava URL"] = { url: data.activity.stravaUrl };
    properties["Strava Activity ID"] = { rich_text: richText(String(data.activity.stravaActivityId)) };
  }

  if (MEMBERS_DATABASE_ID && memberPageId) {
    properties["部員"] = { relation: [{ id: memberPageId }] };
  }

  return notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: properties as Parameters<typeof notion.pages.create>[0]["properties"],
  });
}
