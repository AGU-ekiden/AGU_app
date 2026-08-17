const { findMemberByName, verifyPin, isPlainPin } = require('./_shared/notion');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const pin = typeof body.pin === 'string' ? body.pin.trim() : '';

  if (!name || !/^\d{6}$/.test(pin)) {
    res.status(400).json({ error: '氏名と6桁の暗証番号を入力してください' });
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

  if (!member || !verifyPin(member.pinValue, pin)) {
    res.status(401).json({ error: '氏名または暗証番号が正しくありません' });
    return;
  }

  res.status(200).json({ ok: true, needsPinChange: isPlainPin(member.pinValue) });
};
