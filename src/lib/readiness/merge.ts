import type { ImportTargets } from "../import/structure";
import type { SignalMeta, Signals } from "./types";

// Shared by every way a value reaches a release (upload, API push), so the
// same limits and checks apply whichever door it came through.

export const LIMITS = {
  name: 120,
  summary: 600,
  key: 80,
  document: 20_000,
  documents: 30,
  metrics: 60,
  signoffs: 30,
};

/**
 * Merges incoming values into the current ones. A value with the same key
 * replaces the old one; nothing else is touched. Throws a plain message when
 * a value is not acceptable.
 */
export function mergeSignals(current: Signals, incoming: Signals): Signals {
  const metrics = { ...current.metrics };
  for (const [key, value] of Object.entries(incoming.metrics)) {
    if (key.length > LIMITS.key || !Number.isFinite(value)) {
      throw new Error(`Invalid metric "${key.slice(0, 40)}"`);
    }
    metrics[key] = value;
  }
  const signoffs = { ...current.signoffs };
  for (const [role, signoff] of Object.entries(incoming.signoffs)) {
    if (role.length > LIMITS.key) throw new Error("Sign-off role is too long");
    signoffs[role] = {
      status: signoff.status,
      by: signoff.by?.slice(0, 80),
      note: signoff.note?.slice(0, 300),
    };
  }
  const documents = { ...current.documents };
  for (const [key, doc] of Object.entries(incoming.documents)) {
    if (key.length > LIMITS.key) throw new Error("Document key is too long");
    documents[key] = {
      title: doc.title.slice(0, 160),
      content: doc.content.slice(0, LIMITS.document),
    };
  }
  if (
    Object.keys(metrics).length > LIMITS.metrics ||
    Object.keys(signoffs).length > LIMITS.signoffs ||
    Object.keys(documents).length > LIMITS.documents
  ) {
    throw new Error("Too many signals on one release");
  }
  return { metrics, signoffs, documents };
}

/** Records when, and from where, each incoming value arrived. */
export function stampMeta(
  meta: SignalMeta | undefined,
  incoming: Signals,
  at: number,
  source?: string,
): SignalMeta {
  const next = { ...meta };
  for (const key of Object.keys(incoming.metrics)) next[`metric:${key}`] = { at, source };
  for (const key of Object.keys(incoming.signoffs)) next[`signoff:${key}`] = { at, source };
  for (const key of Object.keys(incoming.documents)) next[`document:${key}`] = { at, source };
  return next;
}

/** "2 metrics, 1 sign-off" for the change log, with the raw counts. */
export function describeSignals(incoming: Signals) {
  const counts = {
    metrics: Object.keys(incoming.metrics).length,
    signoffs: Object.keys(incoming.signoffs).length,
    documents: Object.keys(incoming.documents).length,
  };
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const summary = [
    counts.metrics && plural(counts.metrics, "metric"),
    counts.signoffs && plural(counts.signoffs, "sign-off"),
    counts.documents && plural(counts.documents, "document"),
  ]
    .filter(Boolean)
    .join(", ");
  return { counts, summary: summary || "no values" };
}

/** Keys in the payload that no gate on the release reads. Pushes refuse these. */
export function unknownKeys(targets: ImportTargets, incoming: Signals): string[] {
  const known = {
    metric: new Set(targets.metrics.map((t) => t.key)),
    signoff: new Set(targets.signoffs.map((t) => t.key)),
    document: new Set(targets.documents.map((t) => t.key)),
  };
  return [
    ...Object.keys(incoming.metrics).filter((k) => !known.metric.has(k)).map((k) => `metrics.${k}`),
    ...Object.keys(incoming.signoffs).filter((k) => !known.signoff.has(k)).map((k) => `signoffs.${k}`),
    ...Object.keys(incoming.documents).filter((k) => !known.document.has(k)).map((k) => `documents.${k}`),
  ];
}

/** Reads a push body into signals, or says what is wrong with it. */
export function parsePushBody(body: unknown): { signals: Signals; source?: string } | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Send a JSON object." };
  const b = body as Record<string, unknown>;
  const obj = (x: unknown) => (x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : undefined);
  const signals: Signals = { metrics: {}, signoffs: {}, documents: {} };

  for (const [k, v] of Object.entries(obj(b.metrics) ?? {})) {
    if (typeof v !== "number" || !Number.isFinite(v)) return { error: `metrics.${k} must be a number.` };
    signals.metrics[k] = v;
  }
  for (const [k, v] of Object.entries(obj(b.signoffs) ?? {})) {
    const s = obj(v);
    if (!s || !["approved", "pending", "rejected"].includes(s.status as string)) {
      return { error: `signoffs.${k}.status must be approved, pending or rejected.` };
    }
    signals.signoffs[k] = {
      status: s.status as "approved" | "pending" | "rejected",
      by: typeof s.by === "string" ? s.by : undefined,
      note: typeof s.note === "string" ? s.note : undefined,
    };
  }
  for (const [k, v] of Object.entries(obj(b.documents) ?? {})) {
    const d = obj(v);
    if (!d || typeof d.title !== "string" || typeof d.content !== "string") {
      return { error: `documents.${k} needs a title and content.` };
    }
    signals.documents[k] = { title: d.title, content: d.content };
  }
  if (b.metrics !== undefined && !obj(b.metrics)) return { error: "metrics must be an object." };
  if (b.signoffs !== undefined && !obj(b.signoffs)) return { error: "signoffs must be an object." };
  if (b.documents !== undefined && !obj(b.documents)) return { error: "documents must be an object." };
  const total = Object.keys(signals.metrics).length + Object.keys(signals.signoffs).length + Object.keys(signals.documents).length;
  if (total === 0) return { error: "Send at least one of metrics, signoffs or documents." };
  return { signals, source: typeof b.source === "string" ? b.source.slice(0, 80) : undefined };
}
