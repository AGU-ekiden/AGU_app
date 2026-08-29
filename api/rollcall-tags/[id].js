const { setRollcallTagBadge, archiveRollcallTag } = require('../_shared/notion');

module.exports = async function handler(req, res) {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_ROLLCALL_TAGS_DATABASE_ID) {
    res.status(500).json({ error: 'サーバー設定が未完了です。管理者に連絡してください。' });
    return;
  }

  const id = req.query && req.query.id;
  if (!id) {
    res.status(400).json({ error: 'idが指定されていません' });
    return;
  }

  if (req.method === 'PATCH') {
    const body = req.body || {};
    if (typeof body.showBadge !== 'boolean') {
      res.status(400).json({ error: 'showBadge(true/false)を指定してください' });
      return;
    }
    try {
      await setRollcallTagBadge(id, body.showBadge);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: `更新に失敗しました: ${err.message}` });
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      await archiveRollcallTag(id);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: `削除に失敗しました: ${err.message}` });
    }
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
};
