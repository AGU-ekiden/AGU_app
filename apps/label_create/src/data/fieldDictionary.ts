import type { FieldDefinition } from "../types";

/** Known canonical fields with common Japanese/English header aliases used
 *  to auto-detect column mapping from a spreadsheet's header row. */
export const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    key: "name",
    label: "氏名",
    required: true,
    aliases: ["氏名", "名前", "お名前", "name", "full name", "会員氏名"],
  },
  {
    key: "kana",
    label: "フリガナ",
    aliases: ["フリガナ", "ふりがな", "カナ", "kana", "furigana"],
  },
  {
    key: "memberId",
    label: "会員番号",
    aliases: [
      "会員番号",
      "会員id",
      "会員コード",
      "member id",
      "member no",
      "memberid",
      "id",
    ],
  },
  {
    key: "plan",
    label: "プラン/ランク",
    aliases: [
      "プラン",
      "ランク",
      "会員種別",
      "会員ランク",
      "コース",
      "メンバーシップ名",
      "メンバーシップ",
      "plan",
      "tier",
      "membership",
      "membership type",
    ],
  },
  {
    key: "postalCode",
    label: "郵便番号",
    aliases: ["郵便番号", "〒", "zip", "zip code", "postal code"],
  },
  {
    key: "address",
    label: "住所",
    aliases: ["住所", "ご住所", "address", "住所1", "住所(全体)"],
  },
  {
    key: "company",
    label: "会社名/団体名",
    aliases: ["会社名", "団体名", "所属", "company", "organization"],
  },
  {
    key: "department",
    label: "部署",
    aliases: ["部署", "部署名", "department"],
  },
  {
    key: "email",
    label: "メールアドレス",
    aliases: ["メール", "メールアドレス", "email", "e-mail", "mail"],
  },
  {
    key: "phone",
    label: "電話番号",
    aliases: ["電話番号", "tel", "phone", "電話"],
  },
  {
    key: "validUntil",
    label: "有効期限",
    aliases: ["有効期限", "期限", "expire", "expiry", "valid until"],
  },
  {
    key: "joinedDate",
    label: "入会日",
    aliases: ["入会日", "登録日", "joined", "join date", "registered"],
  },
  {
    key: "tag",
    label: "フリースペース",
    aliases: ["フリースペース", "備考", "メモ", "サイズ", "note", "notes", "remarks", "tag", "size"],
  },
];

const normalize = (s: string) => s.trim().toLowerCase();

/** Given the header row of a spreadsheet, guess a mapping from canonical
 *  field keys to actual header strings using the alias dictionary above. */
export function autoDetectMapping(headers: string[]): Partial<Record<string, string>> {
  const mapping: Partial<Record<string, string>> = {};
  for (const def of FIELD_DEFINITIONS) {
    const match = headers.find((h) => def.aliases.some((alias) => normalize(alias) === normalize(h)));
    if (match) mapping[def.key] = match;
  }
  return mapping;
}
