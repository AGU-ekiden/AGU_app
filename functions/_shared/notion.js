const NOTION_VERSION = '2022-06-28';
const NAME_PROPERTY = '氏名';
const PIN_PROPERTY = '暗証番号';

function notionHeaders(env) {
  return {
    Authorization: `Bearer ${env.NOTION_TOKEN}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

export async function findMemberByName(env, name) {
  const res = await fetch(`https://api.notion.com/v1/databases/${env.NOTION_MEMBERS_DATABASE_ID}/query`, {
    method: 'POST',
    headers: notionHeaders(env),
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

export function isPlainPin(value) {
  return /^\d{6}$/.test(value);
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(storedValue, submittedPin) {
  if (!storedValue) return false;
  if (isPlainPin(storedValue)) return storedValue === submittedPin;
  return (await sha256Hex(submittedPin)) === storedValue;
}

export async function setPinHash(env, pageId, newPin) {
  const hash = await sha256Hex(newPin);
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: notionHeaders(env),
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
