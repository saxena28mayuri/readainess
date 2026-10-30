import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Mirrors src/lib/readiness/types.ts. API keys are never stored here:
// LLM calls run in the browser with the user's own key.

const gateBase = {
  id: v.string(),
  title: v.string(),
  category: v.union(
    v.literal("quality"),
    v.literal("performance"),
    v.literal("resilience"),
    v.literal("operations"),
    v.literal("security"),
    v.literal("signoff"),
  ),
  owner: v.string(),
  blocking: v.boolean(),
};

export const gate = v.union(
  v.object({
    ...gateBase,
    kind: v.literal("metric"),
    metric: v.object({
      signal: v.string(),
      op: v.union(v.literal("<="), v.literal(">="), v.literal("==")),
      target: v.number(),
      unit: v.optional(v.string()),
    }),
  }),
  v.object({
    ...gateBase,
    kind: v.literal("document"),
    document: v.object({ document: v.string(), question: v.string() }),
  }),
  v.object({
    ...gateBase,
    kind: v.literal("signoff"),
    signoff: v.object({ role: v.string() }),
  }),
);

export const signals = v.object({
  metrics: v.record(v.string(), v.number()),
  signoffs: v.record(
    v.string(),
    v.object({
      status: v.union(
        v.literal("approved"),
        v.literal("pending"),
        v.literal("rejected"),
      ),
      by: v.optional(v.string()),
      note: v.optional(v.string()),
    }),
  ),
  documents: v.record(
    v.string(),
    v.object({ title: v.string(), content: v.string() }),
  ),
});

const gateStatus = v.union(
  v.literal("pass"),
  v.literal("fail"),
  v.literal("unknown"),
);

const recommendation = v.union(
  v.literal("go"),
  v.literal("conditional"),
  v.literal("no-go"),
);

export default defineSchema({
  releases: defineTable({
    slug: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("cutover"),
      v.literal("peak"),
      v.literal("standard"),
    ),
    targetDate: v.string(),
    summary: v.string(),
    gates: v.array(gate),
    signals,
    isSample: v.boolean(),
  }).index("by_slug", ["slug"]),

  // One row per readiness check, so readiness can be shown as a trend.
  evaluations: defineTable({
    releaseId: v.id("releases"),
    recommendation,
    results: v.array(
      v.object({
        gateId: v.string(),
        status: gateStatus,
        reason: v.string(),
        evidence: v.array(v.string()),
      }),
    ),
    memo: v.optional(v.string()),
    model: v.optional(v.string()),
  }).index("by_release", ["releaseId"]),

  // The human decision. Overrides of the recommendation must give a reason.
  decisions: defineTable({
    releaseId: v.id("releases"),
    evaluationId: v.id("evaluations"),
    decision: recommendation,
    decidedBy: v.string(),
    reason: v.string(),
    overrode: v.boolean(),
  }).index("by_release", ["releaseId"]),
});
