const { listRollcallTags, createRollcallTag } = require('../_shared/notion');

module.exports = async function handler(req, res) {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_ROLLCALL_TAGS_DATABASE_ID) {
    res.status(500).json({ error: 'サーバー設定が未完了です。管理者に連絡してください。' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const tags = await listRollcallTags();
      res.status(200).json({ tags });
    } catch (err) {
      res.status(500).json({ error: `タグ一覧の取得に失敗しました: ${err.message}` });
    }
    return;
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      res.status(400).json({ error: 'タグ名を入力してください' });
      return;
    }
    try {
      const tag = await createRollcallTag(name);
      res.status(200).json({ tag });
    } catch (err) {
      res.status(500).json({ error: `タグの追加に失敗しました: ${err.message}` });
    }
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
};
