const crypto = require('crypto');

const NOTION_VERSION = '2022-06-28';
const NAME_PROPERTY = '氏名';
const PIN_PROPERTY = '暗証番号';
const CATEGORY_PROPERTY = '区分';
const GRADE_PROPERTY = '学年';
// 血液検査(男子/女子)のボタン出し分け用。部員DBの「性別」列(セレクトまたはテキスト、
// 値は「男子」「女子」)を読む。列名に「性別」を含んでいれば自動認識する。
const GENDER_PROPERTY_PATTERN = /性別/;

function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

// 氏名の表記ゆれ(「伊藤　雅一」「伊藤雅一」「伊藤 雅一」)を同一視するための正規化。
// 全角/半角の違い(NFKC)を揃え、空白類をすべて取り除く。
function normalizeName(name) {
  return String(name).normalize('NFKC').replace(/\s+/g, '');
}

function memberFromPage(page) {
  const prop = page.properties[PIN_PROPERTY];
  const pinValue = prop && prop.type === 'rich_text'
    ? prop.rich_text.map((t) => t.plain_text).join('')
    : '';

  const categoryProp = page.properties[CATEGORY_PROPERTY];
  const category = categoryProp && categoryProp.type === 'select' && categoryProp.select
    ? categoryProp.select.name
    : '';

  let gender = null;
  for (const [propName, genderProp] of Object.entries(page.properties)) {
    if (!GENDER_PROPERTY_PATTERN.test(propName)) continue;
    const text = extractSelectOrText(genderProp);
    if (/女/.test(text)) gender = 'female';
    else if (/男/.test(text)) gender = 'male';
    if (gender) break;
  }

  return { pageId: page.id, pinValue, category, gender };
}

function pageName(page) {
  const nameProp = page.properties[NAME_PROPERTY];
  return nameProp && nameProp.type === 'title' ? nameProp.title.map((t) => t.plain_text).join('') : '';
}

async function queryMembers(body) {
  const res = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_MEMBERS_DATABASE_ID}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Notion query failed: ${res.status}`);
  }
  return res.json();
}

// 入力された氏名に対応する部員を探す。まず入力そのままで完全一致を試し(通常はこれで
// 1回のクエリで済む)、見つからなければ全員を取得して空白の有無・全角半角の違いを
// 無視して照合する。同じ正規化名の部員が複数いて特定できない場合は null を返す。
async function findMemberByName(name) {
  const exact = await queryMembers({
    filter: { property: NAME_PROPERTY, title: { equals: name } },
    page_size: 1,
  });
  if (exact.results && exact.results[0]) return memberFromPage(exact.results[0]);

  const target = normalizeName(name);
  if (!target) return null;

  const matches = [];
  let cursor;
  do {
    const data = await queryMembers({
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    (data.results || []).forEach((page) => {
      if (normalizeName(pageName(page)) === target) matches.push(page);
    });
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);

  return matches.length === 1 ? memberFromPage(matches[0]) : null;
}

function extractSelectOrText(prop) {
  if (!prop) return '';
  if (prop.type === 'select') return prop.select ? prop.select.name : '';
  if (prop.type === 'rich_text') return prop.rich_text.map((t) => t.plain_text).join('');
  if (prop.type === 'title') return prop.title.map((t) => t.plain_text).join('');
  if (prop.type === 'number') return prop.number != null ? String(prop.number) : '';
  return '';
}

function parseGradeNumber(text) {
  const match = String(text).match(/\d+/);
  return match ? Number(match[0]) : null;
}

const PERSON_TAG_PROPERTY = '点呼タグ';

function extractMultiSelectNames(prop) {
  return prop && prop.type === 'multi_select' ? prop.multi_select.map((o) => o.name) : [];
}

// 区分が「選手」の部員を全員取得する(点呼アプリの名簿の自動取得用)。
async function findAthletes() {
  const members = [];
  let cursor;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_MEMBERS_DATABASE_ID}/query`, {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({
        filter: { property: CATEGORY_PROPERTY, select: { equals: '選手' } },
        // ソート指定が無いとNotion側の順序がページ編集(タグの付け外し等)
        // のたびに変わってしまう(last_edited_time相当で揺れる)ため、
        // 「追加した順」を安定させるべく作成日時の昇順を明示する。
        sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`Notion query failed: ${res.status}`);
    }
    const data = await res.json();
    (data.results || []).forEach((page) => {
      const nameProp = page.properties[NAME_PROPERTY];
      const name = nameProp && nameProp.type === 'title' ? nameProp.title.map((t) => t.plain_text).join('') : '';
      const grade = parseGradeNumber(extractSelectOrText(page.properties[GRADE_PROPERTY]));
      const tags = extractMultiSelectNames(page.properties[PERSON_TAG_PROPERTY]);
      if (name && grade) members.push({ id: page.id, name, grade, tags });
    });
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return members;
}

/* ----- 一時的な参加者DB(点呼アプリ内から編集する専用のNotion DB) -----
   設定ミス(DB IDが違う、Integrationが未共有、タイトル列名が氏名でない等)
   を画面上のエラーメッセージだけで切り分けられるよう、NotionのAPIエラー
   本文(message)をそのまま呼び出し元に伝える。 */
const TEMP_NAME_PROPERTY = '氏名';

async function notionErrorMessage(res) {
  try {
    const data = await res.json();
    return data && data.message ? `${data.message} (status ${res.status})` : `Notion API error (status ${res.status})`;
  } catch {
    return `Notion API error (status ${res.status})`;
  }
}

async function listTempParticipants() {
  const members = [];
  let cursor;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_TEMP_PARTICIPANTS_DATABASE_ID}/query`, {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({
        // 追加した順を安定させるため作成日時の昇順を明示する(理由は
        // findAthletes と同じ)。
        sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(await notionErrorMessage(res));
    }
    const data = await res.json();
    (data.results || []).forEach((page) => {
      const nameProp = page.properties[TEMP_NAME_PROPERTY];
      const name = nameProp && nameProp.type === 'title' ? nameProp.title.map((t) => t.plain_text).join('') : '';
      const tags = extractMultiSelectNames(page.properties[PERSON_TAG_PROPERTY]);
      if (name) members.push({ id: page.id, name, tags });
    });
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return members;
}

async function createTempParticipant(name) {
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: process.env.NOTION_TEMP_PARTICIPANTS_DATABASE_ID },
      properties: { [TEMP_NAME_PROPERTY]: { title: [{ text: { content: name } }] } },
    }),
  });
  if (!res.ok) {
    throw new Error(await notionErrorMessage(res));
  }
  const page = await res.json();
  return { id: page.id, name };
}

async function renameTempParticipant(pageId, name) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: notionHeaders(),
    body: JSON.stringify({
      properties: { [TEMP_NAME_PROPERTY]: { title: [{ text: { content: name } }] } },
    }),
  });
  if (!res.ok) {
    throw new Error(await notionErrorMessage(res));
  }
}

async function archiveTempParticipant(pageId) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: notionHeaders(),
    body: JSON.stringify({ archived: true }),
  });
  if (!res.ok) {
    throw new Error(await notionErrorMessage(res));
  }
}

/* ----- 点呼タグ(部員DB・一時参加者DB共通の「点呼タグ」マルチセレクト列) -----
   タグの割り当ては、選手なら部員DB、一時的な参加者なら一時参加者DBの
   各ページの「点呼タグ」プロパティに直接書き込む。この列は最初は存在
   しないので、書き込み前に無ければ自動で追加する(手作業不要)。 */
const ensuredTagPropertyDbs = new Set();

async function getDatabaseSchema(databaseId) {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: notionHeaders(),
  });
  if (!res.ok) throw new Error(await notionErrorMessage(res));
  return res.json();
}

async function ensureTagProperty(databaseId) {
  if (!databaseId || ensuredTagPropertyDbs.has(databaseId)) return;
  const schema = await getDatabaseSchema(databaseId);
  if (!(schema.properties && schema.properties[PERSON_TAG_PROPERTY])) {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'PATCH',
      headers: notionHeaders(),
      body: JSON.stringify({ properties: { [PERSON_TAG_PROPERTY]: { multi_select: {} } } }),
    });
    if (!res.ok) throw new Error(await notionErrorMessage(res));
  }
  ensuredTagPropertyDbs.add(databaseId);
}

// 選手・一時的な参加者どちらのページIDでも渡せる汎用関数(どちらのDBに
// 属するページかを呼び出し側が意識しなくていいよう、両DBの列を用意しておく)。
async function setPersonTags(pageId, tagNames) {
  await ensureTagProperty(process.env.NOTION_MEMBERS_DATABASE_ID);
  await ensureTagProperty(process.env.NOTION_TEMP_PARTICIPANTS_DATABASE_ID);
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: notionHeaders(),
    body: JSON.stringify({
      properties: { [PERSON_TAG_PROPERTY]: { multi_select: tagNames.map((name) => ({ name })) } },
    }),
  });
  if (!res.ok) throw new Error(await notionErrorMessage(res));
}

/* ----- 点呼タグ管理DB(タグの一覧・「ボタンに表示」設定を持つ専用Notion DB) -----
   タグ名(タイトル)とボタンに表示するか(チェックボックス)の2列だけを持つ
   小さなデータベース。全端末で共通のタグ一覧・バッジ表示設定として使う。 */
const ROLLCALL_TAG_NAME_PROPERTY = 'タグ名';
const ROLLCALL_TAG_BADGE_PROPERTY = 'ボタンに表示';

async function listRollcallTags() {
  const tags = [];
  let cursor;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_ROLLCALL_TAGS_DATABASE_ID}/query`, {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });
    if (!res.ok) throw new Error(await notionErrorMessage(res));
    const data = await res.json();
    (data.results || []).forEach((page) => {
      const nameProp = page.properties[ROLLCALL_TAG_NAME_PROPERTY];
      const name = nameProp && nameProp.type === 'title' ? nameProp.title.map((t) => t.plain_text).join('') : '';
      const badgeProp = page.properties[ROLLCALL_TAG_BADGE_PROPERTY];
      const showBadge = badgeProp && badgeProp.type === 'checkbox' ? badgeProp.checkbox : false;
      if (name) tags.push({ id: page.id, name, showBadge });
    });
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return tags;
}

async function createRollcallTag(name) {
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: process.env.NOTION_ROLLCALL_TAGS_DATABASE_ID },
      properties: {
        [ROLLCALL_TAG_NAME_PROPERTY]: { title: [{ text: { content: name } }] },
        [ROLLCALL_TAG_BADGE_PROPERTY]: { checkbox: false },
      },
    }),
  });
  if (!res.ok) throw new Error(await notionErrorMessage(res));
  const page = await res.json();
  return { id: page.id, name, showBadge: false };
}

async function setRollcallTagBadge(tagId, showBadge) {
  const res = await fetch(`https://api.notion.com/v1/pages/${tagId}`, {
    method: 'PATCH',
    headers: notionHeaders(),
    body: JSON.stringify({ properties: { [ROLLCALL_TAG_BADGE_PROPERTY]: { checkbox: showBadge } } }),
  });
  if (!res.ok) throw new Error(await notionErrorMessage(res));
}

async function archiveRollcallTag(tagId) {
  const res = await fetch(`https://api.notion.com/v1/pages/${tagId}`, {
    method: 'PATCH',
    headers: notionHeaders(),
    body: JSON.stringify({ archived: true }),
  });
  if (!res.ok) throw new Error(await notionErrorMessage(res));
}

function isPlainPin(value) {
  return /^\d{6}$/.test(value);
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function verifyPin(storedValue, submittedPin) {
  if (!storedValue) return false;
  if (isPlainPin(storedValue)) return storedValue === submittedPin;
  return sha256Hex(submittedPin) === storedValue;
}

async function setPinHash(pageId, newPin) {
  const hash = sha256Hex(newPin);
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: notionHeaders(),
    body: JSON.stringify({
      properties: {
        [PIN_PROPERTY]: { rich_text: [{ text: { content: hash } }] },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Notion update failed: ${res.status}`);
  }
}

module.exports = {
  findMemberByName,
  findAthletes,
  listTempParticipants,
  createTempParticipant,
  renameTempParticipant,
  archiveTempParticipant,
  setPersonTags,
  listRollcallTags,
  createRollcallTag,
  setRollcallTagBadge,
  archiveRollcallTag,
  isPlainPin,
  verifyPin,
  setPinHash,
};
