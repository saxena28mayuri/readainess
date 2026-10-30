import { describe, expect, it } from "vitest";
import { parseBrief, rulesBrief, validateBrief } from "./brief";
import { evaluateRelease } from "./evaluate";
import { demoReviews } from "./demo";
import { apiGatewayCutover } from "./samples";

const evaluation = evaluateRelease(apiGatewayCutover, demoReviews["api-gateway-cutover"].verdicts);
const notPassing = evaluation.results.filter((r) => r.status !== "pass").map((r) => r.gateId);

describe("decision brief", () => {
  it("lists every gate that is not passing, split into blocking and advisory", () => {
    const b = rulesBrief(apiGatewayCutover, evaluation);
    expect([...b.blockers, ...b.advisory].map((i) => i.gateId).sort()).toEqual([...notPassing].sort());
    expect(b.advisory.map((i) => i.gateId)).toEqual(["partner-comms"]);
    expect(b.summary.startsWith("No-Go")).toBe(true);
    expect(b.source).toBe("rules");
  });

  it("keeps the AI's wording but drops invented gates and fills missed ones", () => {
    const b = validateBrief(
      {
        summary: "No-Go: the rollback has never been rehearsed.",
        items: [
          { gateId: "rollback-plan", issue: "Rollback not rehearsed yet", action: "Run the staging rehearsal on Nov 10 and record the time" },
          { gateId: "made-up-gate", issue: "x", action: "y" },
        ],
      },
      apiGatewayCutover,
      evaluation,
      "ai",
      2,
    );
    const ids = [...b.blockers, ...b.advisory].map((i) => i.gateId);
    expect(ids).not.toContain("made-up-gate");
    expect(ids.sort()).toEqual([...notPassing].sort());
    expect(b.blockers.find((i) => i.gateId === "rollback-plan")?.action).toMatch(/Nov 10/);
    expect(b.summary).toBe("No-Go: the rollback has never been rehearsed.");
    expect(b.documentsRead).toBe(2);
  });

  it("replaces a summary that does not state the call", () => {
    const b = validateBrief({ summary: "Looks great, ship it." }, apiGatewayCutover, evaluation, "ai");
    expect(b.summary.startsWith("No-Go")).toBe(true);
  });

  it("round-trips through the memo field and ignores old plain-text memos", () => {
    const b = rulesBrief(apiGatewayCutover, evaluation);
    expect(parseBrief(JSON.stringify(b))).toEqual(b);
    expect(parseBrief("Recommendation: No-Go for the cutover.")).toBeNull();
  });
});
