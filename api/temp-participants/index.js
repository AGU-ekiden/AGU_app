const {
  listTempParticipants,
  createTempParticipant,
  renameTempParticipant,
  archiveTempParticipant,
} = require('../_shared/notion');

// id をURLのパスセグメント([id].js)ではなくbody/クエリで受け取る構成にして
// いる。vercel.json の trailingSlash:true とAPIの動的ルートの相性が悪く、
// PATCH/DELETE /api/temp-participants/{id} が本番で404になる問題があった
// ため(同じ構成のrollcall-tagsで確認済み)。
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

  if (req.method === 'PATCH') {
    const body = req.body || {};
    const id = typeof body.id === 'string' ? body.id : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!id || !name) {
      res.status(400).json({ error: 'id・氏名を指定してください' });
      return;
    }
    try {
      await renameTempParticipant(id, name);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: `更新に失敗しました: ${err.message}` });
    }
    return;
  }

  if (req.method === 'DELETE') {
    const id = req.query && typeof req.query.id === 'string' ? req.query.id : '';
    if (!id) {
      res.status(400).json({ error: 'idが指定されていません' });
      return;
    }
    try {
      await archiveTempParticipant(id);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: `削除に失敗しました: ${err.message}` });
    }
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
};
