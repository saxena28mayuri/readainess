// Shared readiness types. Used by the browser, Convex functions and tests,
// so this folder must stay free of React, Next.js and Convex imports.

export type ReleaseType = "cutover" | "peak" | "standard" | "custom";

export type GateCategory =
  | "quality"
  | "performance"
  | "resilience"
  | "operations"
  | "security"
  | "signoff";

export type ComparisonOp = "<=" | ">=" | "==";

/** A metric gate is checked in code against a numeric signal. */
export interface MetricRule {
  signal: string;
  op: ComparisonOp;
  target: number;
  unit?: string;
}

/** A document gate is judged by the LLM against a document signal. */
export interface DocumentRule {
  document: string;
  question: string;
}

/** A sign-off gate passes only when the named role has approved. */
export interface SignoffRule {
  role: string;
}

export type Gate = {
  id: string;
  title: string;
  category: GateCategory;
  owner: string;
  /** Blocking gates decide Go/No-Go; advisory gates can only make it Conditional. */
  blocking: boolean;
} & (
  | { kind: "metric"; metric: MetricRule }
  | { kind: "document"; document: DocumentRule }
  | { kind: "signoff"; signoff: SignoffRule }
);

export type SignoffStatus = "approved" | "pending" | "rejected";

export interface Signoff {
  status: SignoffStatus;
  by?: string;
  note?: string;
}

export interface SourceDocument {
  title: string;
  content: string;
}

export interface Signals {
  metrics: Record<string, number>;
  signoffs: Record<string, Signoff>;
  documents: Record<string, SourceDocument>;
}

/** When a value on file arrived, and from which files. Keyed "metric:<key>", "signoff:<role>" or "document:<key>". */
export type SignalMeta = Record<string, { at: number; source?: string }>;

export interface Release {
  slug: string;
  name: string;
  type: ReleaseType;
  targetDate: string;
  summary: string;
  gates: Gate[];
  signals: Signals;
}

export type GateStatus = "pass" | "fail" | "unknown";

/** The LLM's judgement on one document gate, always with a supporting quote. */
export interface DocumentVerdict {
  gateId: string;
  status: GateStatus;
  reason: string;
  quote?: string;
}

export interface GateResult {
  gateId: string;
  status: GateStatus;
  reason: string;
  evidence: string[];
}

export type Recommendation = "go" | "conditional" | "no-go";

export interface Evaluation {
  recommendation: Recommendation;
  results: GateResult[];
  blockers: string[];
  warnings: string[];
}
