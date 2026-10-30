import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { evaluateRelease } from "../src/lib/readiness/evaluate";

const verdict = v.object({
  gateId: v.string(),
  status: v.union(v.literal("pass"), v.literal("fail"), v.literal("unknown")),
  reason: v.string(),
  quote: v.optional(v.string()),
});

export const latest = query({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, { releaseId }) => {
    return await ctx.db
      .query("evaluations")
      .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
      .order("desc")
      .first();
  },
});

/**
 * Records a readiness check. The browser sends the LLM's document verdicts;
 * the recommendation itself is always recomputed here by the rules engine,
 * so a client cannot record a status the evidence does not support.
 */
export const record = mutation({
  args: {
    releaseId: v.id("releases"),
    verdicts: v.array(verdict),
    memo: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { releaseId, verdicts, memo, model }) => {
    const release = await ctx.db.get(releaseId);
    if (!release) throw new Error("Release not found");
    const { recommendation, results } = evaluateRelease(release, verdicts);
    return await ctx.db.insert("evaluations", {
      releaseId,
      recommendation,
      results,
      memo,
      model,
    });
  },
});
