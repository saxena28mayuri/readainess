import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Mirrors src/lib/readiness/types.ts. Users' AI keys are stored only as
// AES-GCM ciphertext (aiKeys) and decrypted inside Convex actions.

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
    // "org:<id>" or "user:<id>" from the Clerk session: only that workspace
    // can see and edit the release. Samples have none and are read-only.
    workspaceId: v.optional(v.string()),
    copiedFrom: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_workspace", ["workspaceId"]),

  // One row per readiness check, so readiness can be shown as a trend.
  // Each workspace sees only its own checks and decisions.
  evaluations: defineTable({
    releaseId: v.id("releases"),
    workspaceId: v.string(),
    // Clerk user id of whoever ran the check.
    checkedBy: v.optional(v.string()),
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
  })
    .index("by_release_workspace", ["releaseId", "workspaceId"])
    .index("by_workspace", ["workspaceId"]),

  // The human decision. Overrides of the recommendation must give a reason.
  // Decisions are never edited or deleted; a newer one supersedes the last.
  decisions: defineTable({
    releaseId: v.id("releases"),
    workspaceId: v.string(),
    evaluationId: v.id("evaluations"),
    decision: recommendation,
    // The recommendation on file when the decision was made.
    recommended: v.optional(recommendation),
    decidedBy: v.string(),
    decidedById: v.optional(v.string()),
    reason: v.string(),
    overrode: v.boolean(),
  }).index("by_release_workspace", ["releaseId", "workspaceId"]),

  // One AI key per user, encrypted with AI_KEY_SECRET (bound to the user id).
  // The plaintext key never leaves Convex actions.
  aiKeys: defineTable({
    userId: v.string(),
    provider: v.union(v.literal("gemini"), v.literal("openai")),
    model: v.string(),
    ciphertext: v.string(),
    iv: v.string(),
    last4: v.string(),
  }).index("by_user", ["userId"]),

  // Metadata about every AI call. Never prompts, files or answers.
  aiLogs: defineTable({
    userId: v.string(),
    workspaceId: v.string(),
    releaseId: v.optional(v.id("releases")),
    task: v.union(v.literal("import"), v.literal("review"), v.literal("key-test"), v.literal("models")),
    provider: v.union(v.literal("gemini"), v.literal("openai")),
    model: v.string(),
    ok: v.boolean(),
    error: v.optional(v.string()),
    latencyMs: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"]),
});
