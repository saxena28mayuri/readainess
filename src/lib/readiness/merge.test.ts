import { describe, expect, it } from "vitest";
import { describeSignals, mergeSignals, parsePushBody, stampMeta, unknownKeys } from "./merge";
import { importTargets } from "@/lib/import/structure";
import { apiGatewayCutover } from "./samples";
import type { Signals } from "./types";

const empty: Signals = { metrics: {}, signoffs: {}, documents: {} };

describe("mergeSignals", () => {
  it("replaces values with the same key and leaves the rest", () => {
    const merged = mergeSignals({ ...empty, metrics: { a: 1, b: 2 } }, { ...empty, metrics: { b: 3 } });
    expect(merged.metrics).toEqual({ a: 1, b: 3 });
  });

  it("refuses non-finite numbers and over-long keys", () => {
    expect(() => mergeSignals(empty, { ...empty, metrics: { a: NaN } })).toThrow(/Invalid metric/);
    expect(() => mergeSignals(empty, { ...empty, metrics: { ["x".repeat(81)]: 1 } })).toThrow();
  });

  it("caps documents at the stored limit", () => {
    const merged = mergeSignals(empty, { ...empty, documents: { d: { title: "t", content: "x".repeat(30_000) } } });
    expect(merged.documents.d.content).toHaveLength(20_000);
  });
});

describe("stampMeta and describeSignals", () => {
  it("stamps only incoming keys and keeps older stamps", () => {
    const meta = stampMeta({ "metric:old": { at: 1 } }, { ...empty, metrics: { p99: 1 } }, 5, "CI run 7");
    expect(meta).toEqual({ "metric:old": { at: 1 }, "metric:p99": { at: 5, source: "CI run 7" } });
  });

  it("describes what arrived", () => {
    expect(describeSignals({ ...empty, metrics: { a: 1, b: 2 } }).summary).toBe("2 metrics");
    expect(describeSignals(empty).summary).toBe("no values");
  });
});

describe("push bodies", () => {
  const targets = importTargets(apiGatewayCutover);

  it("accepts metrics, sign-offs and documents", () => {
    const out = parsePushBody({
      metrics: { regressionPassRate: 98.4 },
      signoffs: { Security: { status: "approved", by: "Priya" } },
      documents: { rollback: { title: "Rollback", content: "steps" } },
      source: "GitHub Actions run 42",
    });
    expect("signals" in out && out.signals.metrics.regressionPassRate).toBe(98.4);
    expect("signals" in out && out.source).toBe("GitHub Actions run 42");
  });

  it("explains what is wrong instead of guessing", () => {
    for (const body of [null, [], "x", {}, { metrics: [] }, { metrics: { a: "98" } }, { signoffs: { Security: { status: "yes" } } }, { documents: { d: { title: "t" } } }]) {
      expect("error" in parsePushBody(body)).toBe(true);
    }
  });

  it("flags keys no gate reads, so pushes cannot create orphan data", () => {
    const signals: Signals = { metrics: { regressionPassRate: 99, typo: 1 }, signoffs: { Nobody: { status: "approved" } }, documents: {} };
    expect(unknownKeys(targets, signals)).toEqual(["metrics.typo", "signoffs.Nobody"]);
  });
});
