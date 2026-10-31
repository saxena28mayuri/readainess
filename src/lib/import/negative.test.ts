import { describe, expect, it } from "vitest";
import { csvRecords, detectDelimiter, looksTabular, parseCsv } from "./csv";
import { applyDocumentPlan, applyTablePlan, importTargets, parseMeasured, parseNumberCell } from "./structure";
import { structureFile, uploadKind } from "../ai/structure";
import type { AskJson } from "../ai/provider";
import { apiGatewayCutover } from "@/lib/readiness/samples";

// What people really upload is messier than the happy path: other delimiters,
// binary or unsupported files, ragged rows, and AI answers that are malformed
// or untrue. None of it may throw or save a wrong number.

const targets = importTargets(apiGatewayCutover);
const ask = (answer: unknown): AskJson => async () => answer as Record<string, unknown>;

describe("odd file layouts", () => {
  it("detects semicolon and tab delimiters from the header line", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
    expect(detectDelimiter('"a;b",c\n1,2')).toBe(",");
  });

  it("reads a semicolon export (common in European locales) as columns", () => {
    const { headers, records } = csvRecords("Status;Priority\nOpen;High\nDone;Low", detectDelimiter("Status;Priority\n"));
    expect(headers).toEqual(["Status", "Priority"]);
    expect(records).toHaveLength(2);
  });

  it("survives a BOM, CRLF, blank lines, ragged rows and duplicate headers", () => {
    const { headers, records } = csvRecords("﻿a,b,a\r\n\r\n1,2,3\r\n4\r\n\r\n");
    expect(headers).toEqual(["a", "b", "a"]);
    expect(records).toEqual([
      { a: "1", b: "2" },
      { a: "4", b: "" },
    ]);
  });

  it("does not crash on an unterminated quote", () => {
    expect(() => parseCsv('a,b\n"oops,1\n2,3')).not.toThrow();
  });

  it("recognises pasted tables so they are not treated as prose", () => {
    expect(looksTabular("Status,Priority\nOpen,High\nDone,Low")).toBe(true);
    expect(looksTabular("Status\tPriority\nOpen\tHigh")).toBe(true);
    expect(looksTabular("The rollback plan, in short, is to revert.\nOwner: Sam")).toBe(false);
    expect(looksTabular("one line, only")).toBe(false);
  });
});

describe("unsupported and unreadable files", () => {
  it("only accepts table and text extensions", () => {
    for (const name of ["a.csv", "a.TSV", "a.txt", "a.md", "a.markdown"]) expect(uploadKind(name)).not.toBeNull();
    for (const name of ["a.xlsx", "a.pdf", "a.docx", "a.json", "a.png", "noextension", "a.csv.exe"]) {
      expect(uploadKind(name)).toBeNull();
    }
  });

  it("rejects an unsupported type instead of treating it as a document", async () => {
    const out = await structureFile(ask({ documentSlot: "rollback" }), targets, { name: "plan.pdf", text: "%PDF-1.7 hello" });
    expect(out.items).toEqual([]);
    expect(out.rejected[0]).toMatch(/csv|tsv|txt|md/i);
  });

  it("rejects binary content even under a text extension", async () => {
    const out = await structureFile(ask({ documentSlot: "rollback" }), targets, { name: "x.txt", text: "PK\u0003\u0004\u0000\u0000binary\u0000" });
    expect(out.items).toEqual([]);
    expect(out.rejected[0]).toMatch(/text|binary|readable/i);
  });

  it("reports empty, whitespace-only and header-only files", async () => {
    for (const [name, text] of [["a.csv", ""], ["a.csv", "  \n \n"], ["a.csv", "Status,Priority\n"], ["a.txt", "   "]] as const) {
      const out = await structureFile(ask({}), targets, { name, text });
      expect(out.items).toEqual([]);
      expect(out.rejected.length).toBeGreaterThan(0);
    }
  });
});

describe("numbers that could be misread", () => {
  it("keeps thousands separators and refuses a decimal comma", () => {
    expect(parseNumberCell("1,204")).toBe(1204);
    expect(parseNumberCell("1,204,500")).toBe(1204500);
    expect(parseNumberCell("1,5")).toBeNull();
    expect(parseNumberCell("12,34")).toBeNull();
  });

  it("refuses text that only looks numeric", () => {
    for (const raw of ["N/A", "", "--", "TBD", "12 apples", "1.2.3", "~300"]) expect(parseNumberCell(raw)).toBeNull();
  });

  it("converts seconds to milliseconds instead of passing 1.2s against a 250 ms target", () => {
    expect(parseMeasured("1.2 s", "ms")).toBe(1200);
    expect(parseMeasured("1200 ms", "s")).toBe(1.2);
    expect(parseMeasured("312 ms", "ms")).toBe(312);
    expect(parseMeasured("312", "ms")).toBe(312);
  });

  it("refuses a unit that cannot be compared with the gate's unit", () => {
    expect(parseMeasured("0.4%", "ms")).toBeNull();
    expect(parseMeasured("250 ms", "%")).toBeNull();
    expect(parseMeasured("98%", "%")).toBe(98);
  });
});

describe("malformed or untrue AI plans", () => {
  const table = csvRecords("Status,Priority,p99\nOpen,High,1.2 s\nDone,Low,200 ms");

  it("never throws on a plan of the wrong shape", () => {
    const bad: unknown[] = [null, undefined, "text", 42, [], { counts: "oops" }, { cells: 5 }, { counts: [null, 7, "x"] }, { cells: [null, {}] }];
    for (const plan of bad) {
      expect(() => applyTablePlan("a.csv", table, plan as never, targets)).not.toThrow();
    }
  });

  it("ignores filter values that are not strings", () => {
    const out = applyTablePlan("a.csv", table, {
      counts: [{ key: "openSev1Sev2", filters: [{ column: "Status", values: [1, null, { x: 1 }] as never }] }],
    }, targets);
    expect(out.items).toEqual([]);
    expect(out.rejected.length).toBeGreaterThan(0);
  });

  it("rejects cells whose row or column does not exist", () => {
    const out = applyTablePlan("a.csv", table, {
      cells: [
        { group: "metric", key: "p99LatencyMs", row: 99, column: "p99" },
        { group: "metric", key: "p99LatencyMs", row: 1, column: "Nope" },
        { group: "metric", key: "p99LatencyMs", row: "abc" as never, column: "p99" },
        { group: "metric", key: "p99LatencyMs", row: 1.5, column: "p99" },
      ],
    }, targets);
    expect(out.items).toEqual([]);
    expect(out.rejected).toHaveLength(4);
  });

  it("converts the latency cell's own unit rather than trusting the bare number", () => {
    const out = applyTablePlan("a.csv", table, { cells: [{ group: "metric", key: "p99LatencyMs", row: 1, column: "p99" }] }, targets);
    expect(out.items[0]).toMatchObject({ key: "p99LatencyMs", value: 1200 });
  });

  it("drops document plans with invented quotes, numbers or names", () => {
    const text = "Security reviewed the change. Signed off by Priya on Monday. p99 was 212 ms.";
    const out = applyDocumentPlan("n.txt", text, {
      metrics: [
        { key: "p99LatencyMs", value: 212, quote: "p99 was 212 ms" },
        { key: "p99LatencyMs", value: 100, quote: "p99 was 212 ms" },
        { key: "p99LatencyMs", value: 212, quote: "this sentence is not there" },
      ],
      signoffs: [{ key: "Security", status: "approved", by: "Dana", quote: "Signed off by Priya on Monday" }],
      documentSlot: "does-not-exist",
    }, targets);
    expect(out.items.filter((i) => i.group === "metric")).toHaveLength(1);
    expect(out.items.find((i) => i.group === "signoff")).toMatchObject({ value: { status: "approved", by: undefined } });
    expect(out.rejected.some((r) => /does-not-exist/.test(r))).toBe(true);
  });

  it("never throws when the AI returns null, a list or text", async () => {
    for (const answer of [null, [], "nope", 7]) {
      for (const name of ["a.csv", "a.txt"]) {
        const out = await structureFile(ask(answer), targets, { name, text: name.endsWith("csv") ? "a,b\n1,2" : "some text" });
        expect(out.items).toEqual([]);
      }
    }
  });
});
