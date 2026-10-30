import type { AskJson } from "./provider";
import { evaluateRelease, quoteAppearsIn } from "../readiness/evaluate";
import type {
  DocumentVerdict,
  Evaluation,
  Gate,
  Release,
} from "../readiness/types";

// Runs on the server (Convex action) with the user's own key; `ask` is the
// logged provider call.

const JUDGE_SYSTEM = `You review release-readiness documents for a go/no-go decision.
Answer the question about the document strictly from its text.
Return JSON: {"status": "pass" | "fail" | "unknown", "reason": string, "quote": string}.
- "pass" only if the document fully satisfies the question.
- "fail" if the document shows the requirement is not met.
- "unknown" if the document does not say.
- "quote" must be copied exactly, character for character, from the document: the single line that best supports your status.
- "reason" is one plain sentence under 25 words.`;

/** Asks the model to judge one document gate. Never throws for bad output. */
export async function judgeDocumentGate(
  ask: AskJson,
  gate: Gate & { kind: "document" },
  release: Release,
): Promise<DocumentVerdict> {
  const doc = release.signals.documents[gate.document.document];
  if (!doc) {
    return { gateId: gate.id, status: "unknown", reason: "Document missing." };
  }
  const out = await ask(
    JUDGE_SYSTEM,
    `Question: ${gate.document.question}\n\nDocument "${doc.title}":\n${doc.content}`,
  );
  const status =
    out.status === "pass" || out.status === "fail" ? out.status : "unknown";
  const reason =
    typeof out.reason === "string" && out.reason ? out.reason : "No reason given.";
  const quote = typeof out.quote === "string" ? out.quote.trim() : undefined;
  // The rules engine re-checks this, but dropping a bad quote here keeps the
  // stored verdict honest about why it was not accepted.
  if (quote && !quoteAppearsIn(quote, doc.content)) {
    return {
      gateId: gate.id,
      status: "unknown",
      reason: "The model's quote does not appear in the document.",
    };
  }
  return { gateId: gate.id, status, reason, quote: quote || undefined };
}

const MEMO_SYSTEM = `You write go/no-go memos for engineering leadership.
Use only the facts given. Every factual sentence ends with the id of the gate it is about, in square brackets, like [rollback-plan]. Only gate ids from "gates" may appear in brackets; write dates and names as plain text.
Structure: a one-line recommendation; what is ready; what blocks, in order of risk; advisory items; the path to Go.
Plain, direct sentences. No headings, no bullet points, no marketing language. Under 220 words.
Return JSON: {"memo": string}.`;

export async function draftMemo(
  ask: AskJson,
  release: Release,
  evaluation: Evaluation,
): Promise<string> {
  const facts = release.gates.map((gate) => {
    const result = evaluation.results.find((r) => r.gateId === gate.id);
    return {
      id: gate.id,
      title: gate.title,
      blocking: gate.blocking,
      status: result?.status,
      reason: result?.reason,
      evidence: result?.evidence,
    };
  });
  const out = await ask(
    MEMO_SYSTEM,
    JSON.stringify({
      release: release.name,
      targetDate: release.targetDate,
      recommendation: evaluation.recommendation,
      gates: facts,
    }),
  );
  return typeof out.memo === "string" ? keepGateCitations(out.memo, release) : "";
}

/** Drops bracketed tokens that are not gate ids, e.g. a stray "[targetDate]". */
export function keepGateCitations(memo: string, release: Release): string {
  const ids = new Set(release.gates.map((g) => g.id));
  return memo
    .replace(/\s*\[([^\]\n]{1,60})\]/g, (match, token: string) => (ids.has(token.trim()) ? match : ""))
    .replace(/ +([.,;:])/g, "$1");
}

export interface ReviewProgress {
  step: "judging" | "drafting";
  done: number;
  total: number;
}

/** Full AI review: judge every document gate, then draft the memo. */
export async function runAiReview(
  ask: AskJson,
  release: Release,
  onProgress?: (p: ReviewProgress) => void,
): Promise<{ verdicts: DocumentVerdict[]; memo: string }> {
  const docGates = release.gates.filter(
    (g): g is Gate & { kind: "document" } => g.kind === "document",
  );
  let done = 0;
  onProgress?.({ step: "judging", done, total: docGates.length });
  const verdicts = await Promise.all(
    docGates.map(async (gate) => {
      const verdict = await judgeDocumentGate(ask, gate, release);
      done += 1;
      onProgress?.({ step: "judging", done, total: docGates.length });
      return verdict;
    }),
  );
  onProgress?.({ step: "drafting", done, total: docGates.length });
  const memo = await draftMemo(
    ask,
    release,
    evaluateRelease(release, verdicts),
  );
  return { verdicts, memo };
}
