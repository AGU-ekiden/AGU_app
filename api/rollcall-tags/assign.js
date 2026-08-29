const { setPersonTags } = require('../_shared/notion');

// 選手(部員DB)・一時的な参加者(一時参加者DB)どちらのページIDでも受け付ける
// 汎用エンドポイント。呼び出し側はどちらのDBのページかを意識しなくてよい。
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  if (!process.env.NOTION_TOKEN) {
    res.status(500).json({ error: 'サーバー設定が未完了です。管理者に連絡してください。' });
    return;
  }

  const body = req.body || {};
  const pageId = typeof body.pageId === 'string' ? body.pageId : '';
  const tags = Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === 'string') : null;
  if (!pageId || !tags) {
    res.status(400).json({ error: 'pageIdとtags(配列)を指定してください' });
    return;
  }

  try {
    await setPersonTags(pageId, tags);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `タグの更新に失敗しました: ${err.message}` });
  }
};
