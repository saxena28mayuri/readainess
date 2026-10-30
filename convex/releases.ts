import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { sampleReleases } from "../src/lib/readiness/samples";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("releases").collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("releases")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

/** Loads the demo releases. Safe to re-run: existing samples are replaced. */
export const seedSamples = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const release of sampleReleases) {
      const existing = await ctx.db
        .query("releases")
        .withIndex("by_slug", (q) => q.eq("slug", release.slug))
        .unique();
      if (existing) await ctx.db.delete(existing._id);
      await ctx.db.insert("releases", { ...release, isSample: true });
    }
    return sampleReleases.length;
  },
});
