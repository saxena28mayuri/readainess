import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getWorkspace, requireWorkspace } from "./workspace";

const recommendation = v.union(
  v.literal("go"),
  v.literal("conditional"),
  v.literal("no-go"),
);

/** Decision log for one release, newest first. Nothing is ever deleted. */
export const list = query({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, { releaseId }) => {
    const workspace = await getWorkspace(ctx);
    if (!workspace) return [];
    return await ctx.db
      .query("decisions")
      .withIndex("by_release_workspace", (q) =>
        q.eq("releaseId", releaseId).eq("workspaceId", workspace.id),
      )
      .order("desc")
      .take(20);
  },
});

/** The latest decision per release, for the releases list. */
export const latestForWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const workspace = await getWorkspace(ctx);
    if (!workspace) return {};
    const rows = await ctx.db
      .query("decisions")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace.id))
      .order("desc")
      .take(200);
    const latest: Record<string, (typeof rows)[number]> = {};
    for (const row of rows) latest[row.releaseId] ??= row;
    return latest;
  },
});

export const record = mutation({
  args: {
    releaseId: v.id("releases"),
    evaluationId: v.id("evaluations"),
    decision: recommendation,
    // Display name from the signed-in Clerk profile; the verified user id is
    // stored alongside it as decidedById.
    decidedBy: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx);
    const evaluation = await ctx.db.get(args.evaluationId);
    if (
      !evaluation ||
      evaluation.releaseId !== args.releaseId ||
      evaluation.workspaceId !== workspace.id
    ) {
      throw new Error("Readiness check not found");
    }
    const decidedBy = args.decidedBy.trim().slice(0, 80) || "Unnamed user";
    const reason = args.reason.trim().slice(0, 1000);
    const overrode = args.decision !== evaluation.recommendation;
    if (overrode && reason.length < 10) {
      throw new Error("Overriding the recommendation needs a reason");
    }
    return await ctx.db.insert("decisions", {
      releaseId: args.releaseId,
      workspaceId: workspace.id,
      evaluationId: args.evaluationId,
      decision: args.decision,
      recommended: evaluation.recommendation,
      decidedBy,
      decidedById: workspace.userId,
      reason,
      overrode,
    });
  },
});
