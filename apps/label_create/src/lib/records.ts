import type { ColumnMapping, MemberRecord } from "../types";

/** Apply a column mapping to raw spreadsheet rows, producing typed member records. */
export function buildMemberRecords(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): MemberRecord[] {
  return rows.map((raw, index) => {
    const record: MemberRecord = { __raw: raw, __rowIndex: index };
    (Object.keys(mapping) as (keyof ColumnMapping)[]).forEach((key) => {
      const header = mapping[key];
      if (header && raw[header] !== undefined) {
        record[key] = raw[header];
      }
    });
    return record;
  });
}
