import type {
  ComparisonOp,
  DocumentVerdict,
  Evaluation,
  Gate,
  GateResult,
  Recommendation,
  Release,
} from "./types";

function compare(actual: number, op: ComparisonOp, target: number): boolean {
  switch (op) {
    case "<=":
      return actual <= target;
    case ">=":
      return actual >= target;
    case "==":
      return actual === target;
  }
}

function formatValue(value: number, unit?: string): string {
  return unit ? `${value}${unit}` : String(value);
}

/**
 * Evaluates one gate. Metric and sign-off gates are decided here in code.
 * Document gates are decided only by a verdict from the LLM; without one,
 * or without a quote backing a pass, they stay "unknown" (no evidence, no pass).
 */
export function evaluateGate(
  gate: Gate,
  release: Release,
  verdicts: Map<string, DocumentVerdict>,
): GateResult {
  const { signals } = release;

  if (gate.kind === "metric") {
    const { signal, op, target, unit } = gate.metric;
    const actual = signals.metrics[signal];
    if (actual === undefined) {
      return {
        gateId: gate.id,
        status: "unknown",
        reason: `No data for "${signal}".`,
        evidence: [],
      };
    }
    const passed = compare(actual, op, target);
    return {
      gateId: gate.id,
      status: passed ? "pass" : "fail",
      reason: `${signal} is ${formatValue(actual, unit)}; required ${op} ${formatValue(target, unit)}.`,
      evidence: [`metrics.${signal} = ${actual}`],
    };
  }

  if (gate.kind === "signoff") {
    const { role } = gate.signoff;
    const signoff = signals.signoffs[role];
    if (!signoff || signoff.status === "pending") {
      return {
        gateId: gate.id,
        status: "unknown",
        reason: `Waiting on ${role} sign-off.`,
        evidence: [],
      };
    }
    const evidence = [
      `${role}: ${signoff.status}${signoff.by ? ` by ${signoff.by}` : ""}`,
    ];
    if (signoff.note) evidence.push(signoff.note);
    return {
      gateId: gate.id,
      status: signoff.status === "approved" ? "pass" : "fail",
      reason:
        signoff.status === "approved"
          ? `${role} approved.`
          : `${role} rejected.`,
      evidence,
    };
  }

  const docKey = gate.document.document;
  const doc = signals.documents[docKey];
  if (!doc) {
    return {
      gateId: gate.id,
      status: "unknown",
      reason: `Document "${docKey}" was not provided.`,
      evidence: [],
    };
  }
  const verdict = verdicts.get(gate.id);
  if (!verdict) {
    return {
      gateId: gate.id,
      status: "unknown",
      reason: `Needs AI review of "${doc.title}".`,
      evidence: [],
    };
  }
  if (verdict.status === "pass" && !verdict.quote) {
    return {
      gateId: gate.id,
      status: "unknown",
      reason: "AI marked this as passing but gave no supporting quote.",
      evidence: [],
    };
  }
  return {
    gateId: gate.id,
    status: verdict.status,
    reason: verdict.reason,
    evidence: verdict.quote ? [`${doc.title}: "${verdict.quote}"`] : [],
  };
}

/**
 * Rolls gate results up into a recommendation:
 * - any blocking gate failed → No-Go
 * - any blocking gate unknown, or any advisory gate not passing → Conditional
 * - otherwise → Go
 */
export function evaluateRelease(
  release: Release,
  verdicts: DocumentVerdict[] = [],
): Evaluation {
  const byGate = new Map(verdicts.map((v) => [v.gateId, v]));
  const results = release.gates.map((gate) =>
    evaluateGate(gate, release, byGate),
  );

  const blockers: string[] = [];
  const warnings: string[] = [];
  let hasBlockingFail = false;

  release.gates.forEach((gate, i) => {
    const result = results[i];
    if (result.status === "pass") return;
    const line = `${gate.title}: ${result.reason}`;
    if (gate.blocking) {
      blockers.push(line);
      if (result.status === "fail") hasBlockingFail = true;
    } else {
      warnings.push(line);
    }
  });

  let recommendation: Recommendation = "go";
  if (hasBlockingFail) recommendation = "no-go";
  else if (blockers.length > 0 || warnings.length > 0)
    recommendation = "conditional";

  return { recommendation, results, blockers, warnings };
}
