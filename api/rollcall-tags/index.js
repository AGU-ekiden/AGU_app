const { listRollcallTags, createRollcallTag, setRollcallTagBadge, archiveRollcallTag } = require('../_shared/notion');

// id をURLのパスセグメント([id].js)ではなくbody/クエリで受け取る構成にして
// いる。vercel.json の trailingSlash:true とAPIの動的ルートの相性が悪く、
// PATCH/DELETE /api/rollcall-tags/{id} が本番で404になる問題があったため。
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

  if (req.method === 'PATCH') {
    const body = req.body || {};
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id || typeof body.showBadge !== 'boolean') {
      res.status(400).json({ error: 'id・showBadge(true/false)を指定してください' });
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
    const id = req.query && typeof req.query.id === 'string' ? req.query.id : '';
    if (!id) {
      res.status(400).json({ error: 'idが指定されていません' });
      return;
    }
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
