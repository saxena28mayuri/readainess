import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { evaluateRelease } from "../src/lib/readiness/evaluate";
import { getWorkspace, requireWorkspace } from "./workspace";

const verdict = v.object({
  gateId: v.string(),
  status: v.union(v.literal("pass"), v.literal("fail"), v.literal("unknown")),
  reason: v.string(),
  quote: v.optional(v.string()),
});

const MAX_TEXT = 4000;

/** Most recent checks for one release in this workspace, newest first. */
export const history = query({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, { releaseId }) => {
    const workspace = await getWorkspace(ctx);
    if (!workspace) return [];
    return await ctx.db
      .query("evaluations")
      .withIndex("by_release_workspace", (q) =>
        q.eq("releaseId", releaseId).eq("workspaceId", workspace.id),
      )
      .order("desc")
      .take(8);
  },
});

/** The latest check per release, for the releases list. */
export const latestForWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const workspace = await getWorkspace(ctx);
    if (!workspace) return {};
    const rows = await ctx.db
      .query("evaluations")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace.id))
      .order("desc")
      .take(200);
    const latest: Record<string, (typeof rows)[number]> = {};
    for (const row of rows) latest[row.releaseId] ??= row;
    return latest;
  },
});

interface CheckInput {
  releaseId: Id<"releases">;
  workspaceId: string;
  userId: string;
  verdicts: { gateId: string; status: "pass" | "fail" | "unknown"; reason: string; quote?: string }[];
  memo?: string;
  model?: string;
}

/**
 * Stores a check. The recommendation is always recomputed here by the rules
 * engine from the release and the document verdicts.
 */
async function insertCheck(ctx: MutationCtx, input: CheckInput) {
  const release = await ctx.db.get(input.releaseId);
  if (!release || (!release.isSample && release.workspaceId !== input.workspaceId)) {
    throw new Error("Release not found");
  }
  const { recommendation, results } = evaluateRelease(release, input.verdicts);
  return await ctx.db.insert("evaluations", {
    releaseId: input.releaseId,
    workspaceId: input.workspaceId,
    checkedBy: input.userId,
    recommendation,
    results,
    memo: input.memo?.slice(0, MAX_TEXT),
    model: input.model?.slice(0, 64),
  });
}

/**
 * Records a demo check from the browser. Only the precomputed sample verdicts
 * come this way (model "demo"); live AI checks are recorded by the server
 * action in convex/ai.ts.
 */
export const record = mutation({
  args: {
    releaseId: v.id("releases"),
    verdicts: v.array(verdict),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx);
    return await insertCheck(ctx, { ...args, workspaceId: workspace.id, userId: workspace.userId, model: "demo" });
  },
});

export const recordFromServer = internalMutation({
  args: {
    releaseId: v.id("releases"),
    workspaceId: v.string(),
    userId: v.string(),
    verdicts: v.array(verdict),
    memo: v.optional(v.string()),
    model: v.string(),
  },
  handler: async (ctx, args) => insertCheck(ctx, args),
});
