import type { Evaluation, Gate, GateResult, Release } from "./types";

// The decision brief: what blocks the release, what is advisory, and the next
// step for each. It is stored as JSON in an evaluation's memo field. The AI
// may write it (better next steps, from the documents it read); without AI it
// is built from the gate results alone. Either way every item belongs to a
// real gate that is not passing, so the brief cannot invent or drop a gate.

export interface BriefItem {
  gateId: string;
  issue: string;
  action: string;
}

export interface Brief {
  v: 1;
  summary: string;
  blockers: BriefItem[];
  advisory: BriefItem[];
  source: "ai" | "rules";
  /** How many document gates the AI read for this check. */
  documentsRead?: number;
}

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : "");

/** A brief stored in a memo field, or null for older plain-text memos. */
export function parseBrief(memo?: string): Brief | null {
  if (!memo || !memo.trim().startsWith("{")) return null;
  try {
    const b = JSON.parse(memo) as Brief;
    return b && b.v === 1 && Array.isArray(b.blockers) && Array.isArray(b.advisory) ? b : null;
  } catch {
    return null;
  }
}

/** The standard issue and next step for a gate, from its result alone. */
export function rulesItem(gate: Gate, result: GateResult, release: Release): BriefItem {
  const missing = result.status === "unknown";
  if (gate.kind === "metric") {
    const has = gate.metric.signal in release.signals.metrics;
    return missing && !has
      ? { gateId: gate.id, issue: "No figure imported yet.", action: `Import an export that contains ${gate.title.toLowerCase()}.` }
      : { gateId: gate.id, issue: result.reason, action: `Bring it within target, then import the updated figure.` };
  }
  if (gate.kind === "signoff") {
    const s = release.signals.signoffs[gate.signoff.role];
    return s?.status === "rejected"
      ? { gateId: gate.id, issue: result.reason, action: `Resolve ${gate.signoff.role}'s objection and ask again.` }
      : { gateId: gate.id, issue: result.reason, action: `Ask ${gate.signoff.role} to record their sign-off.` };
  }
  const doc = release.signals.documents[gate.document.document];
  if (!doc) return { gateId: gate.id, issue: "No document attached.", action: `Import the ${gate.document.document} document.` };
  if (missing && /AI key|review it|Not evaluated/i.test(result.reason))
    return { gateId: gate.id, issue: "Attached but not reviewed yet.", action: "Run a readiness check with your AI key to review it." };
  return { gateId: gate.id, issue: result.reason, action: "Update the document to cover what is missing, then import it again." };
}

const label = { go: "Go", conditional: "Conditional", "no-go": "No-Go" } as const;

/** A brief from the rules alone: used when no AI wrote one. */
export function rulesBrief(release: Release, evaluation: Evaluation): Brief {
  return validateBrief({}, release, evaluation, "rules");
}

/**
 * Turns whatever the AI returned into a brief that matches the check: one
 * item per gate that is not passing, the AI's wording where it gave some,
 * the rules' wording where it did not. Unknown gate ids are dropped.
 */
export function validateBrief(
  raw: unknown,
  release: Release,
  evaluation: Evaluation,
  source: Brief["source"],
  documentsRead?: number,
): Brief {
  const r = (raw && typeof raw === "object" ? raw : {}) as { summary?: unknown; items?: unknown };
  const fromAi = new Map<string, { issue: string; action: string }>();
  if (Array.isArray(r.items)) {
    for (const it of r.items as { gateId?: unknown; issue?: unknown; action?: unknown }[]) {
      const id = clip(it?.gateId, 60);
      if (id) fromAi.set(id, { issue: clip(it.issue, 160), action: clip(it.action, 160) });
    }
  }
  const blockers: BriefItem[] = [];
  const advisory: BriefItem[] = [];
  for (const gate of release.gates) {
    const result = evaluation.results.find((x) => x.gateId === gate.id);
    if (!result || result.status === "pass") continue;
    const base = rulesItem(gate, result, release);
    const ai = fromAi.get(gate.id);
    const item = { gateId: gate.id, issue: ai?.issue || base.issue, action: ai?.action || base.action };
    (gate.blocking ? blockers : advisory).push(item);
  }
  const failing = evaluation.results.filter((x) => x.status === "fail" && release.gates.find((g) => g.id === x.gateId)?.blocking).length;
  const waiting = blockers.length - failing;
  const fallback =
    blockers.length === 0
      ? advisory.length === 0
        ? `${label[evaluation.recommendation]}: every gate has passing evidence.`
        : `${label[evaluation.recommendation]}: every blocking gate passes; ${advisory.length} advisory item${advisory.length === 1 ? "" : "s"} to note.`
      : `${label[evaluation.recommendation]}: ${[failing && `${failing} blocking gate${failing === 1 ? "" : "s"} failing`, waiting && `${waiting} waiting on evidence`].filter(Boolean).join(", ")}.`;
  // The summary may not contradict the call: it must name it.
  let summary = clip(r.summary, 220);
  if (!summary || !summary.toLowerCase().includes(label[evaluation.recommendation].toLowerCase().replace("-", ""))
    && !summary.toLowerCase().includes(label[evaluation.recommendation].toLowerCase())) summary = fallback;
  return { v: 1, summary, blockers, advisory, source, ...(documentsRead !== undefined ? { documentsRead } : {}) };
}
