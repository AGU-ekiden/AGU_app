const crypto = require('crypto');

const NOTION_VERSION = '2022-06-28';
const NAME_PROPERTY = '氏名';
const PIN_PROPERTY = '暗証番号';

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
  return { pageId: page.id, pinValue };
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

module.exports = { findMemberByName, isPlainPin, verifyPin, setPinHash };
