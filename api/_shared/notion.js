const crypto = require('crypto');

const NOTION_VERSION = '2022-06-28';
const NAME_PROPERTY = '氏名';
const PIN_PROPERTY = '暗証番号';
const CATEGORY_PROPERTY = '区分';
const GRADE_PROPERTY = '学年';

function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

async function findMemberByName(name) {
  const res = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_MEMBERS_DATABASE_ID}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      filter: { property: NAME_PROPERTY, title: { equals: name } },
      page_size: 1,
    }),
  });
  if (!res.ok) {
    throw new Error(`Notion query failed: ${res.status}`);
  }
  const data = await res.json();
  const page = data.results && data.results[0];
  if (!page) return null;

  const prop = page.properties[PIN_PROPERTY];
  const pinValue = prop && prop.type === 'rich_text'
    ? prop.rich_text.map((t) => t.plain_text).join('')
    : '';

  const categoryProp = page.properties[CATEGORY_PROPERTY];
  const category = categoryProp && categoryProp.type === 'select' && categoryProp.select
    ? categoryProp.select.name
    : '';

  return { pageId: page.id, pinValue, category };
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
      if (name && grade) members.push({ name, grade });
    });
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return members;
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

module.exports = { findMemberByName, findAthletes, isPlainPin, verifyPin, setPinHash };
