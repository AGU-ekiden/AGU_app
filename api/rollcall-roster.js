const { findAthletes } = require('./_shared/notion');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  if (!process.env.NOTION_TOKEN || !process.env.NOTION_MEMBERS_DATABASE_ID) {
    res.status(500).json({ error: 'サーバー設定が未完了です。管理者に連絡してください。' });
    return;
  }

  try {
    const athletes = await findAthletes();
    res.status(200).json({ athletes });
  } catch (err) {
    res.status(500).json({ error: '部員DBの取得に失敗しました' });
  }
};
