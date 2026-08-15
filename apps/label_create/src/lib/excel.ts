import ExcelJS from "exceljs";
import type { ParsedTable } from "./csv";

/** Parse the first worksheet of an .xlsx file into a header list + row objects. */
export async function parseExcelFile(file: File): Promise<ParsedTable> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("Excelファイルにシートが見つかりませんでした。");
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = (cell.value ?? "").toString().trim();
  });

  const rows: Record<string, string>[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;
    const record: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, idx) => {
      if (!header) return;
      const cell = row.getCell(idx + 1);
      const value = cellToString(cell.value);
      record[header] = value;
      if (value.trim() !== "") hasValue = true;
    });
    if (hasValue) rows.push(record);
  }

  return { headers: headers.filter(Boolean), rows };
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (value instanceof Date) return value.toLocaleDateString("ja-JP");
    if ("richText" in value) {
      return (value.richText as { text: string }[]).map((t) => t.text).join("");
    }
    if ("text" in value) return String((value as { text: unknown }).text ?? "");
    if ("result" in value) return String((value as { result: unknown }).result ?? "");
  }
  return String(value);
}
