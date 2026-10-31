import type { AskJson } from "./provider";
import { csvRecords, detectDelimiter } from "../import/csv";
import {
  MAX_DOCUMENT,
  applyDocumentPlan,
  applyTablePlan,
  profileTable,
  type DocumentPlan,
  type ImportTargets,
  type StructuredFile,
  type TablePlan,
} from "../import/structure";

// Asks the model to map an uploaded file onto the release's checklist. Runs on
// the server (Convex action) with the user's own key. The plan
// that comes back is then verified against the file in plain code.

const TABLE_SYSTEM = `You map an exported table onto a release-readiness checklist.
You never invent, compute or change values. You only say where values are.
Targets (use these keys exactly): metrics, signoffs. Ignore anything that does not fit a target.
Return JSON:
{"description": string,                       // what the file is, under 12 words, e.g. "Jira issue export, 214 issues"
 "counts": [{"key": metricKey, "explanation": string,
             "filters": [{"column": exactHeader, "values": [exact values from that column]}]}],
 "cells": [{"group": "metric" | "signoff", "key": targetKey, "row": number, "column": exactHeader,
            "byColumn"?: exactHeader, "noteColumn"?: exactHeader,
            "status"?: "approved" | "pending" | "rejected"}]}
Use "counts" when a metric is a number of matching rows (for example open Sev1/Sev2 bugs: filter status values that mean open, priority or severity values that mean Sev1/Sev2, and issue type values that mean bug).
Use "cells" when a metric's value is written in one cell. Look at every metric target and ask whether a column holds it: a "p99 (ms)" column holds a p99 latency, a "Pass rate" column a pass rate, an "Errors" column an error rate. When several rows could hold it, choose the row whose labels best match the metric's meaning (for example "new path", "new gateway" or "new cluster" for a metric about the new system; "Regression" for a regression pass rate). "row" is the row number shown in the sample.
For a sign-off, "column" is the status column; always give "byColumn" when a column names the approver and "noteColumn" when a column holds a comment, and give "status" only if the cell text is not a plain word like approved/pending/rejected.
Filter values must be copied exactly from the column values listed.`;

const DOCUMENT_SYSTEM = `You map a document onto a release-readiness checklist.
You never invent or change values. Every value must be written in the document.
Targets (use these keys exactly): metrics, signoffs, documents.
Return JSON:
{"description": string,                // what the document is, under 12 words
 "documentSlot": documentKey | null,   // which document target this is evidence for, or null if none fits
 "metrics": [{"key": metricKey, "value": number, "quote": string}],
 "signoffs": [{"key": signoffKey, "status": "approved" | "pending" | "rejected", "by"?: string, "quote": string}]}
"quote" is copied exactly, character for character, from the document: the sentence that states the value.
Only include metrics and sign-offs the document states explicitly. Empty arrays are fine.`;

function targetsForPrompt(targets: ImportTargets) {
  return {
    metrics: targets.metrics.map((t) => ({ key: t.key, meaning: t.title, unit: t.unit })),
    signoffs: targets.signoffs.map((t) => ({ key: t.key, meaning: t.title })),
    documents: targets.documents.map((t) => ({ key: t.key, meaning: t.title })),
  };
}

export type UploadKind = "table" | "document";

export function uploadKind(fileName: string): UploadKind | null {
  if (/\.(csv|tsv)$/i.test(fileName)) return "table";
  if (/\.(txt|md|markdown)$/i.test(fileName)) return "document";
  return null;
}

/** Binary files (zip, xlsx, pdf, images) decode to NULs or replacement characters. */
export function looksBinary(text: string): boolean {
  const head = text.slice(0, 4000);
  if (head.includes("\u0000")) return true;
  const bad = (head.match(/\uFFFD/g) ?? []).length;
  return head.length > 0 && bad / head.length > 0.02;
}

export async function structureFile(
  ask: AskJson,
  targets: ImportTargets,
  file: { name: string; text: string },
): Promise<StructuredFile> {
  const kind = uploadKind(file.name);
  const rejectFile = (description: string, why: string): StructuredFile => ({ fileName: file.name, description, items: [], rejected: [why] });
  if (!kind) return rejectFile("Unsupported file", "Upload .csv or .tsv tables, or .txt or .md documents. Export spreadsheets and PDFs as CSV or text first.");
  if (looksBinary(file.text)) return rejectFile("Not readable", "This does not look like readable text. Export it as CSV or plain text and try again.");
  if (kind === "table") {
    const table = csvRecords(file.text, /\.tsv$/i.test(file.name) ? "\t" : detectDelimiter(file.text));
    if (table.headers.length === 0 || table.records.length === 0) {
      return { fileName: file.name, description: "Empty table", items: [], rejected: ["The file has no data rows."] };
    }
    const plan = (await ask(
      TABLE_SYSTEM,
      JSON.stringify({ targets: targetsForPrompt(targets), table: profileTable(table) }),
    )) as TablePlan;
    return applyTablePlan(file.name, table, plan, targets);
  }

  const text = file.text.replace(/\r\n/g, "\n").trim();
  if (!text) return { fileName: file.name, description: "Empty file", items: [], rejected: ["The file is empty."] };
  if (text.length > MAX_DOCUMENT) {
    return {
      fileName: file.name,
      description: "Document",
      items: [],
      rejected: ["Documents are limited to 20,000 characters. Upload or paste the relevant section."],
    };
  }
  const plan = (await ask(
    DOCUMENT_SYSTEM,
    `Targets: ${JSON.stringify(targetsForPrompt(targets))}\n\nDocument "${file.name}":\n${text}`,
  )) as DocumentPlan;
  return applyDocumentPlan(file.name, text, plan, targets);
}
