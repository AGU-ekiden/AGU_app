const { findMemberByName, verifyPin, setPinHash } = require('./_shared/notion');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const currentPin = typeof body.currentPin === 'string' ? body.currentPin.trim() : '';
  const newPin = typeof body.newPin === 'string' ? body.newPin.trim() : '';

  if (!name || !/^\d{6}$/.test(currentPin) || !/^\d{6}$/.test(newPin)) {
    res.status(400).json({ error: '入力内容を確認してください' });
    return;
  }

  if (!process.env.NOTION_TOKEN || !process.env.NOTION_MEMBERS_DATABASE_ID) {
    res.status(500).json({ error: 'サーバー設定が未完了です。管理者に連絡してください。' });
    return;
  }

  let member;
  try {
    member = await findMemberByName(name);
  } catch (err) {
    res.status(500).json({ error: '認証処理でエラーが発生しました' });
    return;
  }

  if (!member || !verifyPin(member.pinValue, currentPin)) {
    res.status(401).json({ error: '現在の暗証番号が正しくありません' });
    return;
  }

  try {
    await setPinHash(member.pageId, newPin);
  } catch (err) {
    res.status(500).json({ error: '暗証番号の更新に失敗しました' });
    return;
  }

  res.status(200).json({ ok: true });
};
