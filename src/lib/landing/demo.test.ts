import { describe, expect, it } from "vitest";
import { demoState } from "./demo";

describe("home page demo", () => {
  it("starts with no evidence, so nothing is green", () => {
    const s = demoState([]);
    expect(s.evaluation.results.every((r) => r.status === "unknown")).toBe(true);
    expect(s.evaluation.recommendation).toBe("conditional");
  });

  it("maps every sample file with nothing rejected and ends on No-Go", () => {
    const s = demoState(["jira", "signoffs", "rollback"]);
    expect(s.files.flatMap((f) => f.rejected)).toEqual([]);
    const status = Object.fromEntries(s.evaluation.results.map((r) => [r.gateId, r.status]));
    expect(status).toEqual({ "sev-bugs": "fail", "test-pass": "pass", "rollback-plan": "pass", "security-signoff": "pass" });
    expect(s.release.signals.metrics.openSev1Sev2).toBe(1);
    expect(s.evaluation.recommendation).toBe("no-go");
  });

  it("reports which gates the last file fed", () => {
    expect(demoState(["signoffs"]).touched).toEqual(["test-pass", "security-signoff"]);
  });
});

import { keepGateCitations } from "../ai/review";
import { demoRelease } from "./demo";

describe("memo citations", () => {
  it("keeps gate ids and drops other bracketed tokens", () => {
    const memo = "No-Go for ADO on 2026-10-31 [targetDate]. Bugs remain [sev-bugs].";
    expect(keepGateCitations(memo, demoRelease)).toBe("No-Go for ADO on 2026-10-31. Bugs remain [sev-bugs].");
  });
});
