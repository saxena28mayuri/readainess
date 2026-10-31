import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getWorkspace, requireWorkspace } from "./workspace";
import { importTargets } from "../src/lib/import/structure";
import { describeSignals, mergeSignals, stampMeta, unknownKeys } from "../src/lib/readiness/merge";
import { signals as signalsValidator } from "./schema";

// Workspace tokens let a pipeline or script push values onto a release. The
// token is shown once; only its SHA-256 hash is stored. See http.ts.

const MAX_ACTIVE = 10;

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const body = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `rdy_${body}`;
}

/** Creates a token for this workspace. The plain token is returned once and never again. */
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const workspace = await requireWorkspace(ctx);
    const label = name.trim().slice(0, 60);
    if (!label) throw new Error("Name the token, for example the pipeline that will use it");
    const active = (
      await ctx.db.query("apiTokens").withIndex("by_workspace", (q) => q.eq("workspaceId", workspace.id)).collect()
    ).filter((t) => !t.revokedAt);
    if (active.length >= MAX_ACTIVE) throw new Error(`A workspace can have ${MAX_ACTIVE} active tokens. Revoke one first.`);
    const token = newToken();
    await ctx.db.insert("apiTokens", {
      workspaceId: workspace.id,
      createdById: workspace.userId,
      name: label,
      hash: await sha256Hex(token),
      last4: token.slice(-4),
    });
    return token;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const workspace = await getWorkspace(ctx);
    if (!workspace) return [];
    const rows = await ctx.db.query("apiTokens").withIndex("by_workspace", (q) => q.eq("workspaceId", workspace.id)).collect();
    return rows
      .reverse()
      .map((t) => ({ id: t._id, name: t.name, last4: t.last4, createdAt: t._creationTime, lastUsedAt: t.lastUsedAt, revokedAt: t.revokedAt }));
  },
});

export const revoke = mutation({
  args: { tokenId: v.id("apiTokens") },
  handler: async (ctx, { tokenId }) => {
    const workspace = await requireWorkspace(ctx);
    const token = await ctx.db.get(tokenId);
    if (!token || token.workspaceId !== workspace.id) throw new Error("Token not found");
    if (!token.revokedAt) await ctx.db.patch(tokenId, { revokedAt: Date.now() });
  },
});

type PushResult =
  | { ok: true; applied: { metrics: number; signoffs: number; documents: number } }
  | { ok: false; status: 401 | 404 | 422; error: string; accepts?: ReturnType<typeof importTargets> };

async function releaseForToken(
  ctx: { db: import("./_generated/server").MutationCtx["db"] },
  hash: string,
  slug: string,
) {
  const token = await ctx.db.query("apiTokens").withIndex("by_hash", (q) => q.eq("hash", hash)).unique();
  if (!token || token.revokedAt) return null;
  const release = await ctx.db.query("releases").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
  // Someone else's release, and samples, read as missing.
  if (!release || release.isSample || release.workspaceId !== token.workspaceId) return { token, release: null };
  return { token, release };
}

/** What a release accepts, for the GET endpoint. */
export const targetsFor = internalQuery({
  args: { hash: v.string(), slug: v.string() },
  handler: async (ctx, { hash, slug }) => {
    const token = await ctx.db.query("apiTokens").withIndex("by_hash", (q) => q.eq("hash", hash)).unique();
    if (!token || token.revokedAt) return { ok: false as const, status: 401 as const, error: "Invalid or revoked token." };
    const release = await ctx.db.query("releases").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
    if (!release || release.isSample || release.workspaceId !== token.workspaceId) {
      return { ok: false as const, status: 404 as const, error: "Release not found in this workspace." };
    }
    return { ok: true as const, name: release.name, accepts: importTargets(release) };
  },
});

/** Applies a pushed payload. Keys no gate reads are refused rather than stored as orphans. */
export const applyPush = internalMutation({
  args: { hash: v.string(), slug: v.string(), signals: signalsValidator, source: v.optional(v.string()) },
  handler: async (ctx, { hash, slug, signals, source }): Promise<PushResult> => {
    const found = await releaseForToken(ctx, hash, slug);
    if (!found) return { ok: false, status: 401, error: "Invalid or revoked token." };
    if (!found.release) return { ok: false, status: 404, error: "Release not found in this workspace." };
    const { token, release } = found;

    const accepts = importTargets(release);
    const unknown = unknownKeys(accepts, signals);
    if (unknown.length > 0) {
      return { ok: false, status: 422, error: `No gate on this release reads: ${unknown.join(", ")}.`, accepts };
    }
    const label = `${source ?? "API push"} (token: ${token.name})`.slice(0, 120);
    const at = Date.now();
    const { counts, summary } = describeSignals(signals);
    await ctx.db.patch(release._id, {
      signals: mergeSignals(release.signals, signals),
      signalMeta: stampMeta(release.signalMeta, signals, at, label),
      lastChange: { at, kind: "import", summary, files: [label] },
    });
    await ctx.db.patch(token._id, { lastUsedAt: at });
    return { ok: true, applied: counts };
  },
});
