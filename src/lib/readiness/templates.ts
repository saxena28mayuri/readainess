import type { Gate, ReleaseType } from "./types";

// Starting checklists for new releases. Gates start with no evidence, so a
// new release reads Unknown everywhere until data is imported.

const sevBugs: Gate = {
  id: "sev-bugs",
  title: "No open Sev1/Sev2 bugs",
  category: "quality",
  owner: "QA Lead",
  blocking: true,
  kind: "metric",
  metric: { signal: "openSev1Sev2", op: "==", target: 0 },
};

const regression: Gate = {
  id: "test-pass",
  title: "Regression pass rate",
  category: "quality",
  owner: "QA Lead",
  blocking: true,
  kind: "metric",
  metric: { signal: "regressionPassRate", op: ">=", target: 98, unit: "%" },
};

const securitySignoff: Gate = {
  id: "security-signoff",
  title: "Security sign-off",
  category: "signoff",
  owner: "Security",
  blocking: true,
  kind: "signoff",
  signoff: { role: "Security" },
};

const productSignoff: Gate = {
  id: "product-signoff",
  title: "Product owner sign-off",
  category: "signoff",
  owner: "Product",
  blocking: true,
  kind: "signoff",
  signoff: { role: "Product Owner" },
};

/** The starting points offered on the New release page. Add a kind here and in ReleaseType. */
export const releaseKinds: { value: ReleaseType; label: string; hint: string }[] = [
  { value: "cutover", label: "Cutover or migration", hint: "Moving traffic or data to a new system." },
  { value: "peak", label: "Peak event", hint: "Getting ready for a traffic spike such as a sale." },
  { value: "standard", label: "Standard release", hint: "A regular feature or dependency release." },
  { value: "custom", label: "Blank checklist", hint: "Write your own gates, or copy them from another release." },
];

export const releaseTemplates: Record<ReleaseType, Gate[]> = {
  custom: [],
  cutover: [
    sevBugs,
    regression,
    {
      id: "latency",
      title: "p99 latency on the new path",
      category: "performance",
      owner: "Platform Eng",
      blocking: true,
      kind: "metric",
      metric: { signal: "p99LatencyMs", op: "<=", target: 250, unit: "ms" },
    },
    {
      id: "rollback-plan",
      title: "Rollback plan is complete and rehearsed",
      category: "resilience",
      owner: "Platform Eng",
      blocking: true,
      kind: "document",
      document: {
        document: "rollback",
        question:
          "Does the rollback plan define a trigger, the exact steps, an owner, a time limit, and evidence that it was rehearsed?",
      },
    },
    {
      id: "runbook-oncall",
      title: "Cutover runbook names owners for every step",
      category: "operations",
      owner: "Program Manager",
      blocking: true,
      kind: "document",
      document: {
        document: "runbook",
        question:
          "Does every step in the cutover runbook name an owner and an escalation contact?",
      },
    },
    securitySignoff,
    productSignoff,
  ],
  peak: [
    {
      id: "load-test",
      title: "Load test at 1.5x forecast peak",
      category: "performance",
      owner: "Performance Eng",
      blocking: true,
      kind: "metric",
      metric: { signal: "loadTestMultiplier", op: ">=", target: 1.5, unit: "x" },
    },
    {
      id: "error-budget",
      title: "Error rate under load",
      category: "performance",
      owner: "Service Owner",
      blocking: true,
      kind: "metric",
      metric: { signal: "errorRatePct", op: "<=", target: 0.5, unit: "%" },
    },
    {
      id: "third-party-limits",
      title: "Third-party rate limits confirmed for peak",
      category: "resilience",
      owner: "Integrations",
      blocking: true,
      kind: "document",
      document: {
        document: "vendors",
        question:
          "Has every critical third-party vendor confirmed its rate limit covers the forecast peak?",
      },
    },
    {
      id: "oncall-coverage",
      title: "On-call coverage for the peak window",
      category: "operations",
      owner: "Program Manager",
      blocking: true,
      kind: "document",
      document: {
        document: "oncall",
        question:
          "Is there named primary and secondary on-call coverage for every hour of the peak window?",
      },
    },
    {
      id: "sre-signoff",
      title: "SRE sign-off",
      category: "signoff",
      owner: "SRE",
      blocking: true,
      kind: "signoff",
      signoff: { role: "SRE" },
    },
  ],
  standard: [
    sevBugs,
    regression,
    {
      id: "release-notes",
      title: "Release notes and support guidance ready",
      category: "operations",
      owner: "Support Ops",
      blocking: false,
      kind: "document",
      document: {
        document: "release-notes",
        question:
          "Do the release notes explain every user-facing change and how support should handle it?",
      },
    },
    securitySignoff,
    productSignoff,
  ],
};
