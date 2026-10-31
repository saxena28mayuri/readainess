/**
 * Small RFC 4180 CSV parser: quoted fields, escaped quotes, commas and
 * newlines inside quotes, CRLF or LF. Returns rows of raw strings. Pass "\t"
 * for tab-separated exports.
 */
export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const DELIMITERS = [",", ";", "\t", "|"];

/** Picks the delimiter used by the header line, ignoring any inside quotes. Defaults to a comma. */
export function detectDelimiter(text: string): string {
  const line = text.replace(/^\uFEFF/, "").split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const counts = new Map(DELIMITERS.map((d) => [d, 0]));
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && counts.has(ch)) counts.set(ch, counts.get(ch)! + 1);
  }
  let best = ",";
  let most = 0;
  for (const [d, n] of counts) if (n > most) [best, most] = [d, n];
  return best;
}

/** True when pasted text is a table: two or more rows that mostly share the header's column count. */
export function looksTabular(text: string): boolean {
  const rows = parseCsv(text, detectDelimiter(text)).slice(0, 21);
  if (rows.length < 2 || rows[0].length < 2) return false;
  const matching = rows.slice(1).filter((r) => r.length === rows[0].length).length;
  return matching / (rows.length - 1) >= 0.8;
}

/** Rows as objects keyed by trimmed header. Duplicate headers keep the first. */
export function csvRecords(
  text: string,
  delimiter = ",",
): {
  headers: string[];
  records: Record<string, string>[];
} {
  const [head, ...body] = parseCsv(text, delimiter);
  if (!head) return { headers: [], records: [] };
  const headers = head.map((h) => h.trim());
  const records = body.map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (!(h in record)) record[h] = (cells[i] ?? "").trim();
    });
    return record;
  });
  return { headers, records };
}

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}
