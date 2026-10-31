import { describe, expect, it } from "vitest";
import { evaluateRelease } from "./evaluate";
import { apiGatewayCutover, peakReadiness } from "./samples";
import type { Release } from "./types";

const statusOf = (release: Release, gateId: string, verdicts = []) =>
  evaluateRelease(release, verdicts).results.find((r) => r.gateId === gateId)
    ?.status;

describe("metric gates", () => {
  it("passes when the signal meets the target", () => {
    expect(statusOf(apiGatewayCutover, "latency")).toBe("pass");
  });

  it("fails when the signal misses the target", () => {
    expect(statusOf(peakReadiness, "load-test")).toBe("fail");
  });

  it("is unknown when the signal is missing", () => {
    const release: Release = {
      ...apiGatewayCutover,
      signals: { ...apiGatewayCutover.signals, metrics: {} },
    };
    expect(statusOf(release, "latency")).toBe("unknown");
  });
});

describe("sign-off gates", () => {
  it("passes when approved and is unknown while pending", () => {
    expect(statusOf(apiGatewayCutover, "security-signoff")).toBe("pass");
    expect(statusOf(apiGatewayCutover, "product-signoff")).toBe("unknown");
  });
});

describe("document gates", () => {
  it("are unknown until the AI has reviewed them", () => {
    expect(statusOf(apiGatewayCutover, "rollback-plan")).toBe("unknown");
  });

  it("do not pass without a supporting quote", () => {
    const result = evaluateRelease(apiGatewayCutover, [
      { gateId: "rollback-plan", status: "pass", reason: "Looks fine." },
    ]).results.find((r) => r.gateId === "rollback-plan");
    expect(result?.status).toBe("unknown");
  });

  it("do not trust a quote that is not in the document", () => {
    const result = evaluateRelease(apiGatewayCutover, [
      {
        gateId: "rollback-plan",
        status: "pass",
        reason: "Rehearsed.",
        quote: "Rollback rehearsed successfully on Oct 28.",
      },
    ]).results.find((r) => r.gateId === "rollback-plan");
    expect(result?.status).toBe("unknown");
  });

  it("use the AI verdict and quote when given", () => {
    const result = evaluateRelease(apiGatewayCutover, [
      {
        gateId: "rollback-plan",
        status: "fail",
        reason: "Rollback has not been rehearsed.",
        quote: "Rehearsal: scheduled for Nov 10 in staging. Not yet run.",
      },
    ]).results.find((r) => r.gateId === "rollback-plan");
    expect(result?.status).toBe("fail");
    expect(result?.evidence[0]).toContain("Not yet run");
  });
});

describe("recommendation", () => {
  it("is No-Go when a blocking gate fails", () => {
    expect(evaluateRelease(peakReadiness).recommendation).toBe("no-go");
  });

  it("is Conditional when blocking gates are only unknown", () => {
    expect(evaluateRelease(apiGatewayCutover).recommendation).toBe(
      "conditional",
    );
  });

  it("is Go when every gate passes", () => {
    const release: Release = {
      ...apiGatewayCutover,
      gates: apiGatewayCutover.gates.filter((g) => g.kind === "metric"),
      signals: {
        ...apiGatewayCutover.signals,
        metrics: { ...apiGatewayCutover.signals.metrics, partnersNotifiedPct: 100 },
      },
    };
    expect(evaluateRelease(release).recommendation).toBe("go");
  });

  it("lists advisory gates as warnings, not blockers", () => {
    const { warnings, blockers } = evaluateRelease(apiGatewayCutover);
    expect(warnings.some((w) => w.startsWith("Partner API consumers"))).toBe(true);
    expect(blockers.some((b) => b.startsWith("Partner API consumers"))).toBe(false);
  });
});
