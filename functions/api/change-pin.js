import { findMemberByName, verifyPin, setPinHash } from '../_shared/notion.js';

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
  const currentPin = typeof body.currentPin === 'string' ? body.currentPin.trim() : '';
  const newPin = typeof body.newPin === 'string' ? body.newPin.trim() : '';

  if (!name || !/^\d{6}$/.test(currentPin) || !/^\d{6}$/.test(newPin)) {
    return json({ error: '入力内容を確認してください' }, 400);
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

  if (!member || !(await verifyPin(member.pinValue, currentPin))) {
    return json({ error: '現在の暗証番号が正しくありません' }, 401);
  }

  try {
    await setPinHash(env, member.pageId, newPin);
  } catch (err) {
    return json({ error: '暗証番号の更新に失敗しました' }, 500);
  }

  return json({ ok: true });
}
