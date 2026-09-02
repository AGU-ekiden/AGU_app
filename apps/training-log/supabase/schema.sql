-- 練習日誌アプリ(training-log) — Supabaseスキーマ
--
-- 選手マスタとStravaのOAuthトークンだけを保持する。日誌本文・走行データ自体は
-- Notion側に保存するため、ここには置かない(Supabaseは「連携用の一時テーブル」の位置づけ)。
--
-- 全テーブルRLSを有効化し、ポリシーは一切定義しない。この結果アプリからの
-- アクセスは service_role キー(RLSをバイパスする)を使うAPIルート経由のみに
-- 限定される。ブラウザから直接Supabaseを叩くことは想定していない。

create extension if not exists "pgcrypto";

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- tiryou-karteの「部員マスタ」DBの該当ページID。設定すると日誌に「部員」relationを
  -- 紐付けて他アプリと横断参照できるようになる(任意)。
  notion_member_page_id text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table players is '練習日誌アプリの選手マスタ(表示名・部員マスタDBへの紐付け)';

create table if not exists strava_tokens (
  -- 選手1人につきStravaアカウント1つを想定するため player_id を主キーにする(1:1)。
  player_id uuid primary key references players(id) on delete cascade,
  strava_athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  updated_at timestamptz not null default now()
);

comment on table strava_tokens is '選手ごとのStrava OAuthトークン(refresh_tokenで自動更新)';

alter table players enable row level security;
alter table strava_tokens enable row level security;
