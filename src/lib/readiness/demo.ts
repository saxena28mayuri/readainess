import type { DocumentVerdict } from "./types";

// Precomputed AI results for the sample releases, used in demo mode (no API
// key). Every quote is copied verbatim from the sample documents, so the
// rules engine accepts them exactly as it would a live model's output.

export interface DemoReview {
  verdicts: DocumentVerdict[];
  memo: string;
}

export const demoReviews: Record<string, DemoReview> = {
  "api-gateway-cutover": {
    verdicts: [
      {
        gateId: "rollback-plan",
        status: "fail",
        reason:
          "Trigger, steps, owner and time limit are defined, but the rollback has never been rehearsed.",
        quote: "Rehearsal: scheduled for Nov 10 in staging. Not yet run.",
      },
      {
        gateId: "runbook-oncall",
        status: "fail",
        reason: "The 50% traffic shift has no named owner or escalation contact.",
        quote: "T+15 min: Shift to 50% if error rate stays under 0.5%. Owner: TBD.",
      },
    ],
    memo: `Recommendation: No-Go for the APAC gateway cutover on Nov 14 as things stand.

Quality and performance gates are clean: no open Sev1/Sev2 bugs [sev-bugs], regression pass rate at 99.1% [test-pass] and p99 latency at 212ms against a 250ms limit [latency]. Security has signed off [security-signoff].

Three blocking items remain. The rollback plan has never been rehearsed; the staging rehearsal is only scheduled for Nov 10 [rollback-plan]. The cutover runbook has no owner for the 50% traffic shift [runbook-oncall]. Product owner sign-off is still pending [product-signoff].

Partner notification is at 86% against 100% [partner-comms]; this does not block, but the remaining partners should hear before T-60.

Path to Go: run the rollback rehearsal on Nov 10 and record the result, name an owner and escalation contact for T+15, and collect product sign-off.`,
  },
  "holiday-peak-readiness": {
    verdicts: [
      {
        gateId: "third-party-limits",
        status: "fail",
        reason: "The fraud vendor has not confirmed its rate limit for the peak.",
        quote: "Fraud (ShieldRisk): confirmation requested Oct 18, no response yet.",
      },
      {
        gateId: "oncall-coverage",
        status: "fail",
        reason: "APAC hours have no confirmed secondary on-call.",
        quote:
          "APAC hours (03:00-07:00 CET): primary P. Sharma, secondary P. Sharma's backup to be confirmed.",
      },
    ],
    memo: `Recommendation: No-Go for holiday peak readiness in EMEA until three blocking gaps close.

The load test reached 1.2x forecast peak against the 1.5x target [load-test], so headroom at peak is unproven. The fraud vendor has not confirmed its rate limit [third-party-limits]. APAC hours have no confirmed secondary on-call [oncall-coverage].

Checkout error rate under load is 0.3%, inside the 0.5% budget [error-budget], and SRE has signed off [sre-signoff]. Two code freeze exceptions are unapproved [code-freeze]; this does not block but should be resolved before Nov 24.

Path to Go: rerun the load test at 1.5x, escalate the fraud vendor confirmation, and name an APAC secondary.`,
  },
  "payments-sdk-upgrade": {
    verdicts: [
      {
        gateId: "release-notes",
        status: "fail",
        reason: "Decline code 57 has no agent guidance yet.",
        quote: "Code 57: section to be written.",
      },
    ],
    memo: `Recommendation: Conditional Go for the Payments SDK 4.2 upgrade on Nov 6.

Every blocking gate passes: no open Sev1/Sev2 bugs [sev-bugs], payment regression pass rate at 99.6% [test-pass], canary authorization rate at 97.2% against 96.5% [auth-rate], and Security has signed off [security-signoff].

One advisory gap: the support playbook has no guidance for decline code 57 [release-notes]. Ship once Support Ops confirms the section will be written before launch.`,
  },
};
