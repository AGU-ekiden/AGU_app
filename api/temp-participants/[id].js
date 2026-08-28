const { renameTempParticipant, archiveTempParticipant } = require('../_shared/notion');

function checkEditToken(req, res) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!process.env.ROLLCALL_EDIT_TOKEN || token !== process.env.ROLLCALL_EDIT_TOKEN) {
    res.status(401).json({ error: '合言葉が正しくありません' });
    return false;
  }
  return true;
}

module.exports = async function handler(req, res) {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_TEMP_PARTICIPANTS_DATABASE_ID) {
    res.status(500).json({ error: 'サーバー設定が未完了です。管理者に連絡してください。' });
    return;
  }
  if (!checkEditToken(req, res)) return;

  const id = req.query && req.query.id;
  if (!id) {
    res.status(400).json({ error: 'idが指定されていません' });
    return;
  }

  if (req.method === 'PATCH') {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      res.status(400).json({ error: '氏名を入力してください' });
      return;
    }
    try {
      await renameTempParticipant(id, name);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: '更新に失敗しました' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      await archiveTempParticipant(id);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: '削除に失敗しました' });
    }
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
};
