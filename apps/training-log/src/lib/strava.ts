import { getSupabaseAdmin, StravaTokenRow } from "@/lib/supabase";
import { StravaActivitySummary, StravaLap } from "@/lib/types";

const STRAVA_OAUTH_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_OAUTH_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";

// アプリが選手の代わりに読む権限のみ要求する(投稿・書き込みは不要)。
const STRAVA_SCOPE = "read,activity:read_all";

// トークンの有効期限切れ判定に使う安全マージン。期限ギリギリで使うと
// リクエスト中に切れてAPI呼び出しが401になり得るため、少し早めに更新する。
const EXPIRY_BUFFER_SEC = 300;

function clientId(): string {
  return process.env.STRAVA_CLIENT_ID!;
}

function clientSecret(): string {
  return process.env.STRAVA_CLIENT_SECRET!;
}

export function getAuthorizeUrl(state: string): string {
  const url = new URL(STRAVA_OAUTH_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("redirect_uri", process.env.STRAVA_REDIRECT_URI!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", STRAVA_SCOPE);
  url.searchParams.set("state", state);
  return url.toString();
}

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number };
}

async function requestToken(body: Record<string, string>): Promise<StravaTokenResponse> {
  const response = await fetch(STRAVA_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId(),
      client_secret: clientSecret(),
      ...body,
    }),
  });
  if (!response.ok) {
    throw new Error(`Strava token request failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

// 初回認可コードをトークンに交換し、Supabaseに選手ごとのトークンとして保存する。
export async function exchangeCodeAndSaveToken(playerId: string, code: string): Promise<void> {
  const token = await requestToken({ code, grant_type: "authorization_code" });
  if (!token.athlete?.id) {
    throw new Error("Strava token response did not include athlete id");
  }
  const { error } = await getSupabaseAdmin().from("strava_tokens").upsert(
    {
      player_id: playerId,
      strava_athlete_id: token.athlete.id,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: new Date(token.expires_at * 1000).toISOString(),
      scope: STRAVA_SCOPE,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "player_id" }
  );
  if (error) throw error;
}

// 選手の有効なアクセストークンを返す。期限切れならリフレッシュしてSupabaseを更新する。
// 未連携(トークン行が無い)なら null を返す。
export async function getValidAccessToken(playerId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("strava_tokens")
    .select("*")
    .eq("player_id", playerId)
    .maybeSingle<StravaTokenRow>();
  if (error) throw error;
  if (!data) return null;

  const expiresAt = new Date(data.expires_at).getTime();
  const isExpiringSoon = expiresAt - EXPIRY_BUFFER_SEC * 1000 <= Date.now();
  if (!isExpiringSoon) return data.access_token;

  const refreshed = await requestToken({
    refresh_token: data.refresh_token,
    grant_type: "refresh_token",
  });
  const { error: updateError } = await getSupabaseAdmin()
    .from("strava_tokens")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("player_id", playerId);
  if (updateError) throw updateError;

  return refreshed.access_token;
}

interface StravaApiActivity {
  id: number;
  name: string;
  start_date_local: string;
  distance: number; // meters
  moving_time: number; // seconds
  average_speed: number; // m/s
  average_heartrate?: number;
}

interface StravaApiLap {
  lap_index: number;
  distance: number;
  moving_time: number;
  average_heartrate?: number;
}

function toActivitySummary(activity: StravaApiActivity, laps: StravaLap[] = []): StravaActivitySummary {
  const distanceKm = activity.distance / 1000;
  const avgPaceSecPerKm = activity.average_speed > 0 ? 1000 / activity.average_speed : null;
  return {
    id: activity.id,
    name: activity.name,
    startDateLocal: activity.start_date_local,
    distanceKm: Math.round(distanceKm * 100) / 100,
    movingTimeSec: activity.moving_time,
    avgPaceSecPerKm: avgPaceSecPerKm != null ? Math.round(avgPaceSecPerKm) : null,
    avgHeartRate: activity.average_heartrate != null ? Math.round(activity.average_heartrate) : null,
    stravaUrl: `https://www.strava.com/activities/${activity.id}`,
    laps,
  };
}

async function stravaFetch(accessToken: string, path: string): Promise<Response> {
  return fetch(`${STRAVA_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function fetchLaps(accessToken: string, activityId: number): Promise<StravaLap[]> {
  const response = await stravaFetch(accessToken, `/activities/${activityId}/laps`);
  if (!response.ok) return []; // ラップ取得の失敗はプレビュー表示を止めるほどの問題ではない
  const laps = (await response.json()) as StravaApiLap[];
  return laps.map((lap) => ({
    lapIndex: lap.lap_index,
    distanceMeters: lap.distance,
    movingTimeSec: lap.moving_time,
    avgHeartRate: lap.average_heartrate != null ? Math.round(lap.average_heartrate) : null,
  }));
}

// 直近のアクティビティ(ラン種目)を新しい順に返す。先頭1件だけラップも合わせて取得する。
export async function fetchRecentRunActivities(
  accessToken: string,
  count = 5
): Promise<StravaActivitySummary[]> {
  const response = await stravaFetch(accessToken, `/athlete/activities?per_page=${count * 2}`);
  if (!response.ok) {
    throw new Error(`Strava activities request failed: ${response.status} ${await response.text()}`);
  }
  const activities = (await response.json()) as (StravaApiActivity & { type?: string; sport_type?: string })[];
  const runs = activities
    .filter((a) => a.sport_type === "Run" || a.type === "Run")
    .slice(0, count);

  const summaries = await Promise.all(
    runs.map(async (activity, index) => {
      const laps = index === 0 ? await fetchLaps(accessToken, activity.id) : [];
      return toActivitySummary(activity, laps);
    })
  );
  return summaries;
}
