import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Deletes everything a workspace owns: its releases, every check and
 * decision filed under it, and its AI activity log. Internal only (run from the Convex CLI or
 * dashboard), for when a user or organization is deleted in Clerk.
 */
export const purgeWorkspace = internalMutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, { workspaceId }) => {
    const releases = await ctx.db
      .query("releases")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
    const evaluations = await ctx.db
      .query("evaluations")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
    const decisions = (await ctx.db.query("decisions").collect()).filter(
      (d) => d.workspaceId === workspaceId,
    );
    const aiLogs = await ctx.db
      .query("aiLogs")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
    for (const row of [...aiLogs, ...decisions, ...evaluations, ...releases]) {
      await ctx.db.delete(row._id);
    }
    return {
      releases: releases.length,
      evaluations: evaluations.length,
      decisions: decisions.length,
      aiLogs: aiLogs.length,
    };
  },
});
