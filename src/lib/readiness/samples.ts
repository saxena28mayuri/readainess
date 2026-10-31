import type { Release } from "./types";

// Synthetic demo releases. Each has deliberately planted gaps so the demo
// (and the eval) can show the copilot finding them. All names are fictional.

export const apiGatewayCutover: Release = {
  slug: "api-gateway-cutover",
  name: "API Gateway Cutover (APAC)",
  type: "cutover",
  targetDate: "2026-11-14",
  summary:
    "Move APAC storefront and checkout traffic from the legacy gateway to the new managed API gateway, across 9 engineering teams, with zero downtime.",
  gates: [
    {
      id: "sev-bugs",
      title: "No open Sev1/Sev2 bugs",
      category: "quality",
      owner: "QA Lead",
      blocking: true,
      kind: "metric",
      metric: { signal: "openSev1Sev2", op: "==", target: 0 },
    },
    {
      id: "test-pass",
      title: "Regression pass rate",
      category: "quality",
      owner: "QA Lead",
      blocking: true,
      kind: "metric",
      metric: { signal: "regressionPassRate", op: ">=", target: 98, unit: "%" },
    },
    {
      id: "latency",
      title: "p99 latency through new gateway",
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
      title: "Cutover runbook names on-call owners for every step",
      category: "operations",
      owner: "Program Manager",
      blocking: true,
      kind: "document",
      document: {
        document: "runbook",
        question:
          "Does every step in the cutover runbook name an on-call owner and an escalation contact?",
      },
    },
    {
      id: "partner-comms",
      title: "Partner API consumers notified",
      category: "operations",
      owner: "Partner Success",
      blocking: false,
      kind: "metric",
      metric: { signal: "partnersNotifiedPct", op: ">=", target: 100, unit: "%" },
    },
    {
      id: "security-signoff",
      title: "Security sign-off",
      category: "signoff",
      owner: "Security",
      blocking: true,
      kind: "signoff",
      signoff: { role: "Security" },
    },
    {
      id: "product-signoff",
      title: "Product owner sign-off",
      category: "signoff",
      owner: "Product",
      blocking: true,
      kind: "signoff",
      signoff: { role: "Product Owner" },
    },
  ],
  signals: {
    metrics: {
      openSev1Sev2: 0,
      regressionPassRate: 99.1,
      p99LatencyMs: 212,
      partnersNotifiedPct: 86,
    },
    signoffs: {
      Security: { status: "approved", by: "R. Iyer", note: "Pen test closed out." },
      "Product Owner": { status: "pending" },
    },
    documents: {
      rollback: {
        title: "Gateway rollback plan v3",
        content: `Trigger: roll back if checkout error rate exceeds 1% for 5 minutes or p99 latency exceeds 400ms for 10 minutes.
Owner: Platform on-call (primary), Gateway team lead (secondary).
Steps:
1. Flip the DNS weight for api.apac back to the legacy gateway (100/0).
2. Confirm legacy gateway health dashboards are green.
3. Drain in-flight requests on the new gateway for 2 minutes.
4. Announce rollback in #cutover-war-room.
Time limit: rollback must complete within 15 minutes of the trigger.
Rehearsal: scheduled for Nov 10 in staging. Not yet run.`,
      },
      runbook: {
        title: "APAC cutover runbook",
        content: `T-60 min: Freeze deploys on all 9 services. Owner: Release Manager (A. Mehta). Escalation: Eng Director.
T-30 min: Warm caches on the new gateway. Owner: Platform on-call (S. Rao). Escalation: Platform lead.
T-0: Shift 10% of traffic to the new gateway. Owner: Platform on-call (S. Rao). Escalation: Platform lead.
T+15 min: Shift to 50% if error rate stays under 0.5%. Owner: TBD.
T+45 min: Shift to 100%. Owner: Platform on-call (S. Rao). Escalation: Platform lead.
T+2 h: Close the war room and send the summary. Owner: Program Manager.`,
      },
    },
  },
};

export const peakReadiness: Release = {
  slug: "holiday-peak-readiness",
  name: "Holiday Peak Readiness (EMEA)",
  type: "peak",
  targetDate: "2026-11-27",
  summary:
    "Confirm the EMEA commerce platform is ready for the Black Friday through Cyber Monday peak, expected at 1.5x last year's traffic.",
  gates: [
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
      title: "Checkout error rate under load",
      category: "performance",
      owner: "Checkout Eng",
      blocking: true,
      kind: "metric",
      metric: { signal: "checkoutErrorRatePct", op: "<=", target: 0.5, unit: "%" },
    },
    {
      id: "code-freeze",
      title: "Code freeze exceptions approved",
      category: "operations",
      owner: "Release Manager",
      blocking: false,
      kind: "metric",
      metric: { signal: "unapprovedFreezeExceptions", op: "==", target: 0 },
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
          "Has every critical third-party vendor (payments, tax, fraud, search) confirmed its rate limit covers the forecast peak?",
      },
    },
    {
      id: "oncall-coverage",
      title: "24/7 on-call coverage for the peak window",
      category: "operations",
      owner: "Program Manager",
      blocking: true,
      kind: "document",
      document: {
        document: "oncall",
        question:
          "Is there named primary and secondary on-call coverage for every hour from Nov 27 to Dec 1?",
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
  signals: {
    metrics: {
      loadTestMultiplier: 1.2,
      checkoutErrorRatePct: 0.3,
      unapprovedFreezeExceptions: 2,
    },
    signoffs: {
      SRE: { status: "approved", by: "L. Fischer" },
    },
    documents: {
      vendors: {
        title: "Vendor peak confirmations",
        content: `Payments (PayCo): confirmed 4,000 TPS, forecast peak is 2,600 TPS. Email dated Oct 20.
Tax (TaxCalc): confirmed 1,500 req/s, forecast peak is 900 req/s.
Fraud (ShieldRisk): confirmation requested Oct 18, no response yet.
Search (FindIt): confirmed autoscaling to 3x, contract clause 7.2.`,
      },
      oncall: {
        title: "Peak on-call rota",
        content: `Nov 27-Dec 1, follow-the-sun.
EMEA hours (07:00-19:00 CET): primary M. Novak, secondary J. Okafor.
Americas hours (19:00-03:00 CET): primary D. Ruiz, secondary K. Lee.
APAC hours (03:00-07:00 CET): primary P. Sharma, secondary P. Sharma's backup to be confirmed.`,
      },
    },
  },
};

export const paymentsSdkUpgrade: Release = {
  slug: "payments-sdk-upgrade",
  name: "Payments SDK 4.2 Upgrade",
  type: "standard",
  targetDate: "2026-11-06",
  summary:
    "Upgrade the payments SDK on web and mobile checkout to 4.2 for the new card-network tokenization rules.",
  gates: [
    {
      id: "sev-bugs",
      title: "No open Sev1/Sev2 bugs",
      category: "quality",
      owner: "QA Lead",
      blocking: true,
      kind: "metric",
      metric: { signal: "openSev1Sev2", op: "==", target: 0 },
    },
    {
      id: "test-pass",
      title: "Payment regression pass rate",
      category: "quality",
      owner: "QA Lead",
      blocking: true,
      kind: "metric",
      metric: { signal: "regressionPassRate", op: ">=", target: 99, unit: "%" },
    },
    {
      id: "auth-rate",
      title: "Card authorization rate in canary",
      category: "performance",
      owner: "Payments Eng",
      blocking: true,
      kind: "metric",
      metric: { signal: "canaryAuthRatePct", op: ">=", target: 96.5, unit: "%" },
    },
    {
      id: "release-notes",
      title: "Support playbook covers new decline codes",
      category: "operations",
      owner: "Support Ops",
      blocking: false,
      kind: "document",
      document: {
        document: "playbook",
        question:
          "Does the support playbook explain how agents should handle each new decline code introduced in SDK 4.2?",
      },
    },
    {
      id: "security-signoff",
      title: "Security sign-off",
      category: "signoff",
      owner: "Security",
      blocking: true,
      kind: "signoff",
      signoff: { role: "Security" },
    },
  ],
  signals: {
    metrics: {
      openSev1Sev2: 0,
      regressionPassRate: 99.6,
      canaryAuthRatePct: 97.2,
    },
    signoffs: {
      Security: { status: "approved", by: "R. Iyer", note: "PCI scope unchanged." },
    },
    documents: {
      playbook: {
        title: "Checkout support playbook (draft)",
        content: `New in SDK 4.2: decline codes 54 (expired token), 57 (network tokenization unavailable) and 61 (issuer step-up required).
Code 54: ask the customer to re-enter their card; the token refreshes automatically.
Code 61: guide the customer through their bank's verification prompt.
Code 57: section to be written.`,
      },
    },
  },
};

export const sampleReleases: Release[] = [
  apiGatewayCutover,
  peakReadiness,
  paymentsSdkUpgrade,
];
