import { findMemberByName, verifyPin, isPlainPin } from '../_shared/notion.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'リクエストが不正です' }, 400);
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const pin = typeof body.pin === 'string' ? body.pin.trim() : '';

  if (!name || !/^\d{6}$/.test(pin)) {
    return json({ error: '氏名と6桁の暗証番号を入力してください' }, 400);
  }

  if (!env.NOTION_TOKEN || !env.NOTION_MEMBERS_DATABASE_ID) {
    return json({ error: 'サーバー設定が未完了です。管理者に連絡してください。' }, 500);
  }

  let member;
  try {
    member = await findMemberByName(env, name);
  } catch (err) {
    return json({ error: '認証処理でエラーが発生しました' }, 500);
  }

  if (!member || !(await verifyPin(member.pinValue, pin))) {
    return json({ error: '氏名または暗証番号が正しくありません' }, 401);
  }

  return json({ ok: true, needsPinChange: isPlainPin(member.pinValue) });
}
