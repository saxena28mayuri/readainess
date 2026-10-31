import type { AskJson } from "./provider";
import { evaluateRelease, quoteAppearsIn } from "../readiness/evaluate";
import { validateBrief } from "../readiness/brief";
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

const BRIEF_SYSTEM = `You write the decision brief for a release go/no-go meeting.
Use only the facts given. For every gate whose status is not "pass", write one item:
- "issue": only the gap, in plain words a release manager understands, under 14 words. The gate's title is shown above it, so never repeat the title; never use the gate id or brackets. Good: "Rehearsal is only scheduled for Nov 10 and has not run." Bad: "Rollback plan is complete and rehearsed has not been rehearsed."
- "action": the concrete next step that would make it pass, under 16 words, starting with a verb. Base it on the gate's reason and evidence (for example a rehearsal date or a missing owner named in a document).
Also write "summary": one sentence under 25 words that states the recommendation word exactly as given (Go, Conditional or No-Go) and the main reason.
Return JSON: {"summary": string, "items": [{"gateId": string, "issue": string, "action": string}]}.`;

/** Asks the model for the brief; the result is checked against the gates. */
export async function draftBrief(
  ask: AskJson,
  release: Release,
  evaluation: Evaluation,
  documentsRead: number,
): Promise<string> {
  const label = { go: "Go", conditional: "Conditional", "no-go": "No-Go" }[evaluation.recommendation];
  const gates = release.gates.map((gate) => {
    const result = evaluation.results.find((r) => r.gateId === gate.id);
    return {
      gateId: gate.id,
      title: gate.title,
      blocking: gate.blocking,
      owner: gate.owner,
      status: result?.status,
      reason: result?.reason,
      evidence: result?.evidence,
    };
  });
  const out = await ask(
    BRIEF_SYSTEM,
    JSON.stringify({ release: release.name, targetDate: release.targetDate, recommendation: label, gates }),
  );
  return JSON.stringify(validateBrief(out, release, evaluation, "ai", documentsRead));
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
  const read = docGates.filter((g) => release.signals.documents[g.document.document]).length;
  const memo = await draftBrief(ask, release, evaluateRelease(release, verdicts), read);
  return { verdicts, memo };
}
