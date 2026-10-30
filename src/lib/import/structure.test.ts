import { describe, expect, it } from "vitest";
import { csvRecords, parseCsv } from "./csv";
import { signalsTemplate } from "./parse";
import {
  applyDocumentPlan,
  applyTablePlan,
  importTargets,
  itemsToPatch,
  numberInQuote,
  parseNumberCell,
  profileTable,
  setDocumentSlot,
} from "./structure";
import { apiGatewayCutover } from "@/lib/readiness/samples";

const targets = importTargets(apiGatewayCutover);

const JIRA = [
  "Issue key,Summary,Issue Type,Status,Sev",
  "GW-1,Checkout 502,Bug,In Progress,S1",
  "GW-2,Header missing,Bug,To Do,S2",
  "GW-3,Stale CORS,Bug,Done,S1",
  "GW-4,Typo,Bug,To Do,S4",
  "GW-5,New endpoint,Story,To Do,S1",
].join("\n");

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, commas and newlines in fields", () => {
    const rows = parseCsv('a,b\n"x, y","say ""hi""\nthere"\n');
    expect(rows).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"\nthere'],
    ]);
  });

  it("reads tab-separated files", () => {
    expect(csvRecords("k\tv\nlatency\t312 ms", "\t").records).toEqual([{ k: "latency", v: "312 ms" }]);
  });
});

describe("table plans", () => {
  const table = csvRecords(JIRA);

  it("profiles columns with their distinct values", () => {
    const profile = profileTable(table);
    expect(profile.rowCount).toBe(5);
    expect(profile.columns.find((c) => c.header === "Sev")).toMatchObject({ values: { S1: 3, S2: 1, S4: 1 } });
  });

  it("counts rows in code from the proposed filters", () => {
    const out = applyTablePlan("jira.csv", table, {
      counts: [
        {
          key: "openSev1Sev2",
          filters: [
            { column: "Status", values: ["In Progress", "To Do"] },
            { column: "Sev", values: ["S1", "S2"] },
            { column: "Issue Type", values: ["Bug"] },
          ],
        },
      ],
    }, targets);
    expect(out.items).toEqual([
      expect.objectContaining({ group: "metric", key: "openSev1Sev2", value: 2, source: expect.objectContaining({ rows: [1, 2] }) }),
    ]);
  });

  it("drops filter values that are not in the column instead of trusting them", () => {
    const out = applyTablePlan("jira.csv", table, {
      counts: [{ key: "openSev1Sev2", filters: [{ column: "Sev", values: ["S1", "Sev-1 (critical)"] }] }],
    }, targets);
    expect(out.items[0]).toMatchObject({ value: 3, source: { rule: "Sev is S1" } });
  });

  it("rejects unknown columns, unknown metrics and values that are not numbers", () => {
    const metrics = csvRecords("name,value\np99,fast\nregression,98.6%");
    const out = applyTablePlan("m.csv", metrics, {
      counts: [{ key: "openSev1Sev2", filters: [{ column: "Priority", values: ["High"] }] }],
      cells: [
        { group: "metric", key: "p99LatencyMs", row: 1, column: "value" },
        { group: "metric", key: "regressionPassRate", row: 2, column: "value" },
        { group: "metric", key: "madeUp", row: 2, column: "value" },
        { group: "metric", key: "partnersNotifiedPct", row: 9, column: "value" },
      ],
    }, targets);
    expect(itemsToPatch([out]).metrics).toEqual({ regressionPassRate: 98.6 });
    expect(out.rejected).toHaveLength(4);
  });

  it("reads sign-offs from cells, with approver and note columns", () => {
    const signoffs = csvRecords("Team,State,Approver,Comment\nSecurity,Signed off,Ana Ruiz,Pen test closed\nProduct Owner,LGTM,Sam Lee,");
    const out = applyTablePlan("s.csv", signoffs, {
      cells: [
        { group: "signoff", key: "Security", row: 1, column: "State", byColumn: "Approver", noteColumn: "Comment" },
        { group: "signoff", key: "Product Owner", row: 2, column: "State", byColumn: "Approver", status: "approved" },
      ],
    }, targets);
    expect(itemsToPatch([out]).signoffs).toEqual({
      Security: { status: "approved", by: "Ana Ruiz", note: "Pen test closed" },
      "Product Owner": { status: "approved", by: "Sam Lee", note: undefined },
    });
  });

  it("parses number cells with units but not prose", () => {
    expect(parseNumberCell("312 ms")).toBe(312);
    expect(parseNumberCell("1,204")).toBe(1204);
    expect(parseNumberCell("about 300")).toBeNull();
  });
});

describe("document plans", () => {
  const doc = "Rollback plan\nRollback rehearsed on 12 Oct in 6 minutes.\nSecurity approved by Ana Ruiz on 14 Oct.\np99 latency was 212 ms in the soak.";

  it("keeps values whose quote and number are in the document", () => {
    const out = applyDocumentPlan("rollback-plan.md", doc, {
      documentSlot: "rollback",
      metrics: [{ key: "p99LatencyMs", value: 212, quote: "p99 latency was 212 ms in the soak." }],
      signoffs: [{ key: "Security", status: "approved", by: "Ana Ruiz", quote: "Security approved by Ana Ruiz on 14 Oct." }],
    }, targets);
    const patch = itemsToPatch([out]);
    expect(patch.metrics).toEqual({ p99LatencyMs: 212 });
    expect(patch.signoffs.Security).toEqual({ status: "approved", by: "Ana Ruiz" });
    expect(patch.documents.rollback).toEqual({ title: "rollback plan", content: doc });
    expect(out.rejected).toEqual([]);
  });

  it("rejects invented quotes, mismatched numbers and names not in the quote", () => {
    const out = applyDocumentPlan("notes.txt", doc, {
      documentSlot: "nope",
      metrics: [
        { key: "p99LatencyMs", value: 180, quote: "p99 latency was 212 ms in the soak." },
        { key: "regressionPassRate", value: 99, quote: "Regression pass rate 99%." },
      ],
      signoffs: [{ key: "Security", status: "approved", by: "Sam Lee", quote: "Security approved by Ana Ruiz on 14 Oct." }],
    }, targets);
    const patch = itemsToPatch([out]);
    expect(patch.metrics).toEqual({});
    expect(patch.signoffs.Security).toEqual({ status: "approved", by: undefined });
    expect(out.rejected).toHaveLength(3);
  });

  it("lets the user move or detach a document", () => {
    const out = applyDocumentPlan("plan.md", doc, { documentSlot: "rollback" }, targets);
    expect(itemsToPatch([setDocumentSlot(out, doc, "runbook")]).documents).toHaveProperty("runbook");
    expect(itemsToPatch([setDocumentSlot(out, doc, null)]).documents).toEqual({});
  });

  it("matches numbers inside quotes exactly", () => {
    expect(numberInQuote(1204, "We saw 1,204 errors")).toBe(true);
    expect(numberInQuote(12, "We saw 120 errors")).toBe(false);
  });
});

describe("merge and template", () => {
  it("lets later files win for the same key", () => {
    const table = csvRecords("k,v\na,1\nb,2");
    const a = applyTablePlan("a.csv", table, { cells: [{ group: "metric", key: "p99LatencyMs", row: 1, column: "v" }] }, targets);
    const b = applyTablePlan("b.csv", table, { cells: [{ group: "metric", key: "p99LatencyMs", row: 2, column: "v" }] }, targets);
    expect(itemsToPatch([a, b]).metrics.p99LatencyMs).toBe(2);
  });

  it("builds a template listing every metric and sign-off", () => {
    const rows = parseCsv(signalsTemplate(apiGatewayCutover));
    expect(rows[0]).toEqual(["type", "key", "value", "by", "note"]);
    expect(rows.filter((r) => r[0] === "metric")).toHaveLength(targets.metrics.length);
    expect(rows.filter((r) => r[0] === "signoff")).toHaveLength(targets.signoffs.length);
  });
});
