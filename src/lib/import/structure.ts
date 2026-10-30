import { quoteAppearsIn } from "../readiness/evaluate";
import type { Release, Signals, SignoffStatus } from "../readiness/types";

// The AI proposes *where* each value is in an uploaded file: which columns
// and values to count, which cell holds a number, which sentence records a
// sign-off. Everything here is plain code that reads the actual values from
// the file and rejects any proposal it cannot verify. The AI never supplies a
// number or a document body itself.

/* ---------- what a release can receive ---------- */

export interface ImportTargets {
  metrics: { key: string; title: string; unit?: string }[];
  signoffs: { key: string; title: string }[];
  documents: { key: string; title: string }[];
}

export function importTargets(release: Release): ImportTargets {
  const targets: ImportTargets = { metrics: [], signoffs: [], documents: [] };
  for (const gate of release.gates) {
    if (gate.kind === "metric") {
      targets.metrics.push({ key: gate.metric.signal, title: gate.title, unit: gate.metric.unit });
    } else if (gate.kind === "signoff") {
      targets.signoffs.push({ key: gate.signoff.role, title: gate.title });
    } else {
      targets.documents.push({ key: gate.document.document, title: gate.title });
    }
  }
  return targets;
}

/* ---------- results ---------- */

export type Provenance =
  | { kind: "count"; rule: string; rows: number[] }
  | { kind: "cell"; row: number; column: string; raw: string }
  | { kind: "quote"; quote: string }
  | { kind: "file" };

export type ExtractedItem =
  | { group: "metric"; key: string; value: number; source: Provenance }
  | {
      group: "signoff";
      key: string;
      value: { status: SignoffStatus; by?: string; note?: string };
      source: Provenance;
    }
  | { group: "document"; key: string; value: { title: string; content: string }; source: Provenance };

export interface StructuredFile {
  fileName: string;
  /** The AI's one-line description of the file, e.g. "Jira issue export". */
  description: string;
  items: ExtractedItem[];
  /** Proposals that failed verification, shown so nothing disappears silently. */
  rejected: string[];
}

/* ---------- tables (CSV / TSV) ---------- */

export interface Table {
  headers: string[];
  /** Data rows only; row 1 is the first line after the header. */
  records: Record<string, string>[];
}

export interface TablePlan {
  description?: string;
  counts?: {
    key?: string;
    explanation?: string;
    filters?: { column?: string; values?: string[] }[];
  }[];
  cells?: {
    group?: "metric" | "signoff";
    key?: string;
    row?: number;
    column?: string;
    byColumn?: string;
    noteColumn?: string;
    /** Only used when the status text is not a standard word; shown to the user. */
    status?: string;
  }[];
}

const MAX_PROFILE_DISTINCT = 25;

/** What the model sees of a table: headers, each column's values, sample rows. */
export function profileTable(table: Table, sampleRows = 25) {
  const columns = table.headers.map((header) => {
    const counts = new Map<string, number>();
    for (const r of table.records) {
      const v = r[header] ?? "";
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const distinct = counts.size;
    return distinct <= MAX_PROFILE_DISTINCT
      ? { header, distinct, values: Object.fromEntries(counts) }
      : { header, distinct, examples: [...counts.keys()].slice(0, 4).map((v) => v.slice(0, 80)) };
  });
  const rows = table.records.slice(0, sampleRows).map((r, i) => ({
    row: i + 1,
    ...Object.fromEntries(table.headers.map((h) => [h, (r[h] ?? "").slice(0, 120)])),
  }));
  return { rowCount: table.records.length, columns, rows };
}

const norm = (s: string) => s.trim().toLowerCase();

/** Parses a cell like "312 ms", "0.4%", "1,204" or "3.2x" without guessing. */
export function parseNumberCell(raw: string): number | null {
  const m = raw.trim().replace(/,/g, "").match(/^([-+]?\d*\.?\d+)\s*(%|ms|s|x|rps|req\/s)?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

const STATUS_WORDS: Record<string, SignoffStatus> = {
  approved: "approved",
  approve: "approved",
  yes: "approved",
  "signed off": "approved",
  "sign-off": "approved",
  signed: "approved",
  done: "approved",
  go: "approved",
  pending: "pending",
  "in review": "pending",
  "in progress": "pending",
  waiting: "pending",
  tbd: "pending",
  "": "pending",
  rejected: "rejected",
  reject: "rejected",
  no: "rejected",
  declined: "rejected",
  blocked: "rejected",
  "no-go": "rejected",
};

const isStatus = (s: unknown): s is SignoffStatus =>
  s === "approved" || s === "pending" || s === "rejected";

export function applyTablePlan(
  fileName: string,
  table: Table,
  plan: TablePlan,
  targets: ImportTargets,
): StructuredFile {
  const out: StructuredFile = {
    fileName,
    description: plan.description?.slice(0, 160) || "Table",
    items: [],
    rejected: [],
  };
  const metricKeys = new Set(targets.metrics.map((t) => t.key));
  const signoffKeys = new Set(targets.signoffs.map((t) => t.key));
  const hasColumn = (c?: string): c is string => !!c && table.headers.includes(c);

  for (const count of plan.counts ?? []) {
    const key = count.key ?? "";
    if (!metricKeys.has(key)) {
      out.rejected.push(`Count for unknown metric "${key}" ignored.`);
      continue;
    }
    const filters = (count.filters ?? []).filter((f) => f.values?.length);
    const bad = filters.find((f) => !hasColumn(f.column));
    if (bad || filters.length === 0) {
      out.rejected.push(`Count for ${key} ignored: ${bad ? `no column "${bad.column}"` : "no filters"}.`);
      continue;
    }
    // Keep only values that really occur in the column, so the rule shown is
    // exactly the rule applied.
    const sets = filters.map((f) => {
      const present = new Set(table.records.map((r) => norm(r[f.column!] ?? "")));
      const values = f.values!.filter((v) => present.has(norm(v)));
      return { column: f.column!, values, set: new Set(values.map(norm)) };
    });
    const empty = sets.find((s) => s.values.length === 0);
    if (empty) {
      out.rejected.push(`Count for ${key} ignored: none of the proposed values occur in "${empty.column}".`);
      continue;
    }
    const rows: number[] = [];
    table.records.forEach((r, i) => {
      if (sets.every((s) => s.set.has(norm(r[s.column] ?? "")))) rows.push(i + 1);
    });
    const rule = sets.map((s) => `${s.column} is ${s.values.join(" or ")}`).join(", and ");
    out.items.push({ group: "metric", key, value: rows.length, source: { kind: "count", rule, rows } });
  }

  for (const cell of plan.cells ?? []) {
    const key = cell.key ?? "";
    const row = Number(cell.row);
    const record = Number.isInteger(row) && row >= 1 ? table.records[row - 1] : undefined;
    if (!record || !hasColumn(cell.column)) {
      out.rejected.push(`Value for "${key}" ignored: row ${cell.row}, column "${cell.column}" does not exist.`);
      continue;
    }
    const raw = record[cell.column] ?? "";
    const source: Provenance = { kind: "cell", row, column: cell.column, raw };
    if (cell.group === "metric") {
      if (!metricKeys.has(key)) {
        out.rejected.push(`Value for unknown metric "${key}" ignored.`);
        continue;
      }
      const value = parseNumberCell(raw);
      if (value === null) {
        out.rejected.push(`${key}: "${raw}" in row ${row} is not a number.`);
        continue;
      }
      out.items.push({ group: "metric", key, value, source });
    } else if (cell.group === "signoff") {
      if (!signoffKeys.has(key)) {
        out.rejected.push(`Sign-off for unknown role "${key}" ignored.`);
        continue;
      }
      const status = STATUS_WORDS[norm(raw)] ?? (isStatus(cell.status) ? cell.status : undefined);
      if (!status) {
        out.rejected.push(`${key}: could not read "${raw}" as approved, pending or rejected.`);
        continue;
      }
      const by = hasColumn(cell.byColumn) ? record[cell.byColumn] || undefined : undefined;
      const note = hasColumn(cell.noteColumn) ? record[cell.noteColumn] || undefined : undefined;
      out.items.push({ group: "signoff", key, value: { status, by, note }, source });
    } else {
      out.rejected.push(`Value for "${key}" ignored: unknown kind.`);
    }
  }
  return out;
}

/* ---------- documents (TXT / MD) ---------- */

export interface DocumentPlan {
  description?: string;
  documentSlot?: string | null;
  metrics?: { key?: string; value?: number; quote?: string }[];
  signoffs?: { key?: string; status?: string; by?: string; quote?: string }[];
}

export const MAX_DOCUMENT = 20_000;

/** True when the number is written in the quote (ignoring thousands separators). */
export function numberInQuote(value: number, quote: string): boolean {
  const numbers = quote.replace(/(\d),(\d)/g, "$1$2").match(/[-+]?\d*\.?\d+/g) ?? [];
  return numbers.some((n) => Number(n) === value);
}

export function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.(txt|md|markdown)$/i, "").replace(/[-_]+/g, " ").trim() || fileName;
}

export function applyDocumentPlan(
  fileName: string,
  text: string,
  plan: DocumentPlan,
  targets: ImportTargets,
): StructuredFile {
  const content = text.replace(/\r\n/g, "\n").trim();
  const out: StructuredFile = {
    fileName,
    description: plan.description?.slice(0, 160) || "Document",
    items: [],
    rejected: [],
  };
  const metricKeys = new Set(targets.metrics.map((t) => t.key));
  const signoffKeys = new Set(targets.signoffs.map((t) => t.key));
  const slots = new Set(targets.documents.map((t) => t.key));

  for (const m of plan.metrics ?? []) {
    const key = m.key ?? "";
    const quote = (m.quote ?? "").trim();
    if (!metricKeys.has(key)) out.rejected.push(`Value for unknown metric "${key}" ignored.`);
    else if (typeof m.value !== "number" || !quote || !quoteAppearsIn(quote, content))
      out.rejected.push(`${key}: the quoted sentence is not in the document.`);
    else if (!numberInQuote(m.value, quote))
      out.rejected.push(`${key}: ${m.value} does not appear in the quoted sentence.`);
    else out.items.push({ group: "metric", key, value: m.value, source: { kind: "quote", quote } });
  }

  for (const s of plan.signoffs ?? []) {
    const key = s.key ?? "";
    const quote = (s.quote ?? "").trim();
    if (!signoffKeys.has(key)) out.rejected.push(`Sign-off for unknown role "${key}" ignored.`);
    else if (!isStatus(s.status)) out.rejected.push(`${key}: no clear sign-off status.`);
    else if (!quote || !quoteAppearsIn(quote, content))
      out.rejected.push(`${key}: the quoted sentence is not in the document.`);
    else {
      // A name is kept only if it is written in the quote itself.
      const by = s.by && quoteAppearsIn(s.by, quote) ? s.by.trim() : undefined;
      out.items.push({ group: "signoff", key, value: { status: s.status, by }, source: { kind: "quote", quote } });
    }
  }

  const slot = plan.documentSlot ?? null;
  if (slot && slots.has(slot)) {
    out.items.push({
      group: "document",
      key: slot,
      value: { title: titleFromFileName(fileName), content },
      source: { kind: "file" },
    });
  } else if (slot) {
    out.rejected.push(`Document slot "${slot}" does not exist on this release.`);
  }
  return out;
}

/** Moves a document to another slot, or detaches it when slot is null. */
export function setDocumentSlot(file: StructuredFile, text: string, slot: string | null): StructuredFile {
  const items: ExtractedItem[] = file.items.filter((i) => i.group !== "document");
  if (slot) {
    items.push({
      group: "document",
      key: slot,
      value: { title: titleFromFileName(file.fileName), content: text.replace(/\r\n/g, "\n").trim() },
      source: { kind: "file" },
    });
  }
  return { ...file, items };
}

/* ---------- merge ---------- */

/** Combines files in upload order; a later file wins for the same key. */
export function itemsToPatch(files: StructuredFile[]): Signals {
  const patch: Signals = { metrics: {}, signoffs: {}, documents: {} };
  for (const file of files) {
    for (const item of file.items) {
      if (item.group === "metric") patch.metrics[item.key] = item.value;
      else if (item.group === "signoff") patch.signoffs[item.key] = item.value;
      else patch.documents[item.key] = item.value;
    }
  }
  return patch;
}

/** The winning item per key, for showing where each change came from. */
export function winningItems(files: StructuredFile[]) {
  const map = new Map<string, { item: ExtractedItem; fileName: string }>();
  for (const file of files) {
    for (const item of file.items) map.set(`${item.group}:${item.key}`, { item, fileName: file.fileName });
  }
  return map;
}
