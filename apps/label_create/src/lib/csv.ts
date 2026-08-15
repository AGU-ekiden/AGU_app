import Papa from "papaparse";

export interface ParsedTable {
  headers: string[];
  rows: Record<string, string>[];
}

/** Parse raw CSV text into a header list + row objects, trimming header names
 *  and dropping fully-empty trailing rows. */
export function parseCsvText(csvText: string): ParsedTable {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    const fatal = result.errors.find((e) => e.type !== "FieldMismatch");
    if (fatal) {
      throw new Error(`CSVの解析に失敗しました: ${fatal.message}`);
    }
  }

  const headers = result.meta.fields ?? [];
  const rows = result.data.filter((row) =>
    Object.values(row).some((v) => (v ?? "").toString().trim() !== "")
  );

  return { headers, rows };
}
