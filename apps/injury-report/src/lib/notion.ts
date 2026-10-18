import { Client } from "@notionhq/client";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { InjuryReportFormData, InjuryReportRecord, PlayerInfo } from "@/types/injury";

// Cloudflare Workers対策として他アプリでも使っているパターン(@notionhq/client
// のデフォルトfetchの代わりにグローバルfetchを渡す)。Vercelでは不要だが
// 害もないので合わせておく。
const notion = new Client({ auth: process.env.NOTION_TOKEN, fetch: globalThis.fetch });
const MEMBERS_DATABASE_ID = process.env.NOTION_MEMBERS_DATABASE_ID!;
const INJURY_REPORT_DATABASE_ID = process.env.NOTION_INJURY_REPORT_DATABASE_ID!;

function richText(value: string) {
  return [{ text: { content: value } }];
}

function extractText(prop: PageObjectResponse["properties"][string]): string {
  if (!prop) return "";
  if (prop.type === "rich_text") return prop.rich_text.map((t) => t.plain_text).join("");
  if (prop.type === "title") return prop.title.map((t) => t.plain_text).join("");
  if (prop.type === "select") return prop.select?.name ?? "";
  return "";
}

function extractTags(prop: PageObjectResponse["properties"][string]): string[] {
  return prop && prop.type === "multi_select" ? prop.multi_select.map((t) => t.name) : [];
}

function extractRelationId(prop: PageObjectResponse["properties"][string]): string | undefined {
  return prop?.type === "relation" && prop.relation.length > 0 ? prop.relation[0].id : undefined;
}

function extractNumber(prop: PageObjectResponse["properties"][string]): number | undefined {
  return prop?.type === "number" && prop.number != null ? prop.number : undefined;
}

function extractDate(prop: PageObjectResponse["properties"][string]): string {
  return prop?.type === "date" && prop.date?.start ? prop.date.start.slice(0, 10) : "";
}

// ポータルのログイン(api/_shared/notion.js)と同じ正規化ルール。全角/半角の
// 違い(NFKC)を揃え、空白類を取り除いて比較する。ログイン時に保存される
// 氏名(localStorageのagu_portal_auth)と部員DBの氏名を突き合わせるのに使う。
export function normalizeName(name: string): string {
  return name.normalize("NFKC").replace(/\s+/g, "");
}

export async function getPlayers(): Promise<PlayerInfo[]> {
  const response = await notion.databases.query({
    database_id: MEMBERS_DATABASE_ID,
    filter: { property: "区分", select: { equals: "選手" } },
    page_size: 100,
  });

  return (response.results as PageObjectResponse[]).map((page) => {
    const p = page.properties;
    return {
      id: page.id,
      name: extractText(p["氏名"]),
      grade: p["学年"] ? extractText(p["学年"]) || undefined : undefined,
    };
  });
}

export async function findPlayerByName(name: string): Promise<PlayerInfo | null> {
  const target = normalizeName(name);
  if (!target) return null;
  const players = await getPlayers();
  return players.find((p) => normalizeName(p.name) === target) ?? null;
}

function pageToReport(page: PageObjectResponse): InjuryReportRecord {
  const p = page.properties;
  return {
    id: page.id,
    playerId: extractRelationId(p["部員"]),
    playerName: extractText(p["選手名"]),
    reportDate: extractDate(p["報告日"]),
    injuryStartDate: extractDate(p["故障者入りした日"]),
    painLocations: extractTags(p["痛みのある個所"]),
    stage: extractText(p["ステージ"]),
    weeklyDistance: extractNumber(p["今週の走行距離"]),
    pointRejoinDate: extractDate(p["ポイント合流した日"]),
    createdAt: page.created_time,
  };
}

export async function createInjuryReport(data: InjuryReportFormData): Promise<InjuryReportRecord> {
  const response = (await notion.pages.create({
    parent: { database_id: INJURY_REPORT_DATABASE_ID },
    properties: {
      "選手名": { title: richText(`${data.playerName} ${data.reportDate}`) },
      "部員": { relation: [{ id: data.playerId }] },
      "報告日": { date: { start: data.reportDate } },
      "故障者入りした日": data.injuryStartDate ? { date: { start: data.injuryStartDate } } : { date: null },
      "痛みのある個所": { multi_select: data.painLocations.map((name) => ({ name })) },
      "ステージ": { select: { name: data.stage } },
      "今週の走行距離": data.weeklyDistance != null ? { number: data.weeklyDistance } : { number: null },
      "ポイント合流した日": data.pointRejoinDate ? { date: { start: data.pointRejoinDate } } : { date: null },
    },
  })) as PageObjectResponse;
  return pageToReport(response);
}

export async function getReportsByPlayer(playerId: string): Promise<InjuryReportRecord[]> {
  const response = await notion.databases.query({
    database_id: INJURY_REPORT_DATABASE_ID,
    filter: { property: "部員", relation: { contains: playerId } },
    sorts: [{ property: "報告日", direction: "descending" }],
    page_size: 100,
  });
  return (response.results as PageObjectResponse[]).map(pageToReport);
}

// トレーナー用ダッシュボード向け: 直近(デフォルト2週間)に報告のあった
// 選手一覧。週次ログの性質上、「最新の報告」が各選手の現在地点になる。
export async function getRecentReports(days = 13): Promise<InjuryReportRecord[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const response = await notion.databases.query({
    database_id: INJURY_REPORT_DATABASE_ID,
    filter: { timestamp: "created_time", created_time: { on_or_after: since.toISOString() } },
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    page_size: 100,
  });
  return (response.results as PageObjectResponse[]).map(pageToReport);
}
