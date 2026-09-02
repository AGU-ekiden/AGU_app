import { createClient, SupabaseClient } from "@supabase/supabase-js";

// service_role キーを使うサーバー専用クライアント。RLSを全てバイパスするため
// 絶対にAPIルート(サーバー側)以外から使わないこと。ブラウザには渡さない。
//
// 遅延生成にしているのは、Next.jsのビルド時(APIルートのページデータ収集)に
// このモジュールが評価されるため、環境変数未設定のローカルビルド確認時にも
// createClient()が即座に例外を投げてビルド自体を失敗させないようにするため。
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!cached) {
    cached = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return cached;
}

export interface PlayerRow {
  id: string;
  name: string;
  notion_member_page_id: string | null;
  active: boolean;
}

export interface StravaTokenRow {
  player_id: string;
  strava_athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
}
