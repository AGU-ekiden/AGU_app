const { listTempParticipants, createTempParticipant } = require('../_shared/notion');

module.exports = async function handler(req, res) {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_TEMP_PARTICIPANTS_DATABASE_ID) {
    res.status(500).json({ error: 'サーバー設定が未完了です。管理者に連絡してください。' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const participants = await listTempParticipants();
      res.status(200).json({ participants });
    } catch (err) {
      res.status(500).json({ error: `一時的な参加者の取得に失敗しました: ${err.message}` });
    }
    return;
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      res.status(400).json({ error: '氏名を入力してください' });
      return;
    }
    try {
      const participant = await createTempParticipant(name);
      res.status(200).json({ participant });
    } catch (err) {
      res.status(500).json({ error: `追加に失敗しました: ${err.message}` });
    }
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
};
