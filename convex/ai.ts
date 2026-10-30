import { ConvexError, v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  completeJson,
  friendlyAiError,
  listGeminiModels,
  providerInfo,
  testKey,
  type AiConfig,
  type AskJson,
  type Provider,
} from "../src/lib/ai/provider";
import { runAiReview } from "../src/lib/ai/review";
import { structureFile as structureWithAi, uploadKind } from "../src/lib/ai/structure";
import { importTargets, type StructuredFile } from "../src/lib/import/structure";
import { getWorkspace, requireWorkspace, type Workspace } from "./workspace";

// All AI calls run here, on the server, with the signed-in user's own key.
// The key is stored only as AES-GCM ciphertext bound to the user id, is
// decrypted inside these actions, and is never returned to the browser. Every
// call is logged as metadata (never prompts, files or answers).

const provider = v.union(v.literal("gemini"), v.literal("openai"));
const MAX_UPLOAD_CHARS = 2_000_000;

/* ---------- encryption ---------- */

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function secretKey() {
  const secret = process.env.AI_KEY_SECRET;
  if (!secret) throw new Error("AI_KEY_SECRET is not set on this deployment");
  return crypto.subtle.importKey("raw", unb64(secret), "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(plain: string, userId: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(userId) },
    await secretKey(),
    new TextEncoder().encode(plain),
  );
  return { ciphertext: b64(new Uint8Array(data)), iv: b64(iv) };
}

async function decrypt(row: Pick<Doc<"aiKeys">, "ciphertext" | "iv" | "userId">) {
  const data = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(row.iv), additionalData: new TextEncoder().encode(row.userId) },
    await secretKey(),
    unb64(row.ciphertext),
  );
  return new TextDecoder().decode(data);
}

/* ---------- key storage (internal) ---------- */

export const keyRow = internalQuery({
  args: { userId: v.string() },
  handler: (ctx, { userId }) =>
    ctx.db.query("aiKeys").withIndex("by_user", (q) => q.eq("userId", userId)).unique(),
});

export const storeKey = internalMutation({
  args: { userId: v.string(), provider, model: v.string(), ciphertext: v.string(), iv: v.string(), last4: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("aiKeys").withIndex("by_user", (q) => q.eq("userId", args.userId)).unique();
    if (existing) await ctx.db.replace(existing._id, args);
    else await ctx.db.insert("aiKeys", args);
  },
});

export const log = internalMutation({
  args: {
    userId: v.string(),
    workspaceId: v.string(),
    releaseId: v.optional(v.id("releases")),
    task: v.union(v.literal("import"), v.literal("review"), v.literal("key-test"), v.literal("models")),
    provider,
    model: v.string(),
    ok: v.boolean(),
    error: v.optional(v.string()),
    latencyMs: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiLogs", args);
  },
});

/** A sample, or a release in the caller's workspace. */
export const releaseFor = internalQuery({
  args: { releaseId: v.id("releases"), workspaceId: v.string() },
  handler: async (ctx, { releaseId, workspaceId }) => {
    const release = await ctx.db.get(releaseId);
    if (!release || (!release.isSample && release.workspaceId !== workspaceId)) return null;
    return release;
  },
});

/* ---------- helpers for actions ---------- */

async function loadConfig(ctx: ActionCtx, workspace: Workspace): Promise<AiConfig> {
  const row = await ctx.runQuery(internal.ai.keyRow, { userId: workspace.userId });
  if (!row) throw new ConvexError("Add your AI key in Settings first.");
  return { provider: row.provider, model: row.model, apiKey: await decrypt(row) };
}

/** A provider call that records its metadata whether it succeeds or fails. */
function loggedAsk(
  ctx: ActionCtx,
  ai: AiConfig,
  workspace: Workspace,
  task: "import" | "review",
  releaseId?: Id<"releases">,
): AskJson {
  return async (system, user) => {
    const started = Date.now();
    try {
      const { data, usage } = await completeJson(ai, system, user);
      await ctx.runMutation(internal.ai.log, {
        userId: workspace.userId, workspaceId: workspace.id, releaseId, task,
        provider: ai.provider, model: ai.model, ok: true, latencyMs: Date.now() - started, ...usage,
      });
      return data;
    } catch (err) {
      const error = friendlyAiError(err, ai.provider);
      await ctx.runMutation(internal.ai.log, {
        userId: workspace.userId, workspaceId: workspace.id, releaseId, task,
        provider: ai.provider, model: ai.model, ok: false, error, latencyMs: Date.now() - started,
      });
      throw new ConvexError(error);
    }
  };
}

async function timed<T>(
  ctx: ActionCtx,
  workspace: Workspace,
  ai: Omit<AiConfig, "apiKey">,
  task: "key-test" | "models",
  run: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    const out = await run();
    await ctx.runMutation(internal.ai.log, {
      userId: workspace.userId, workspaceId: workspace.id, task,
      provider: ai.provider, model: ai.model, ok: true, latencyMs: Date.now() - started,
    });
    return out;
  } catch (err) {
    const error = friendlyAiError(err, ai.provider);
    await ctx.runMutation(internal.ai.log, {
      userId: workspace.userId, workspaceId: workspace.id, task,
      provider: ai.provider, model: ai.model, ok: false, error, latencyMs: Date.now() - started,
    });
    throw new ConvexError(error);
  }
}

/* ---------- public API ---------- */

/** What Settings may show about the key: never the key itself. */
export const keyStatus = query({
  args: {},
  handler: async (ctx) => {
    const workspace = await getWorkspace(ctx);
    if (!workspace) return null;
    const row = await ctx.db.query("aiKeys").withIndex("by_user", (q) => q.eq("userId", workspace.userId)).unique();
    return row ? { provider: row.provider, model: row.model, last4: row.last4, savedAt: row._creationTime } : null;
  },
});

/** Tests the key with the provider, then stores it encrypted. */
export const saveKey = action({
  args: { provider, apiKey: v.string(), model: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx);
    const apiKey = args.apiKey.trim();
    if (apiKey.length < 20 || apiKey.length > 300) throw new ConvexError("That does not look like an API key.");
    const model = (args.model?.trim() || providerInfo[args.provider].defaultModel).slice(0, 80);
    const ai: AiConfig = { provider: args.provider, apiKey, model };
    await timed(ctx, workspace, ai, "key-test", () => testKey(ai));
    const sealed = await encrypt(apiKey, workspace.userId);
    await ctx.runMutation(internal.ai.storeKey, {
      userId: workspace.userId, provider: args.provider, model, ...sealed, last4: apiKey.slice(-4),
    });
    return { provider: args.provider, model };
  },
});

/** Re-tests the saved key, optionally with a different model, and keeps it. */
export const setModel = action({
  args: { model: v.string() },
  handler: async (ctx, { model }) => {
    const workspace = await requireWorkspace(ctx);
    const row = await ctx.runQuery(internal.ai.keyRow, { userId: workspace.userId });
    if (!row) throw new ConvexError("Add your AI key in Settings first.");
    const ai: AiConfig = { provider: row.provider, model: model.trim().slice(0, 80), apiKey: await decrypt(row) };
    await timed(ctx, workspace, ai, "key-test", () => testKey(ai));
    await ctx.runMutation(internal.ai.storeKey, {
      userId: row.userId, provider: row.provider, model: ai.model, ciphertext: row.ciphertext, iv: row.iv, last4: row.last4,
    });
  },
});

/** Gemini models the saved key can call. */
export const listModels = action({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const workspace = await requireWorkspace(ctx);
    const ai = await loadConfig(ctx, workspace);
    if (ai.provider !== "gemini") return [];
    return timed(ctx, workspace, ai, "models", () => listGeminiModels(ai.apiKey));
  },
});

export const forgetKey = mutation({
  args: {},
  handler: async (ctx) => {
    const workspace = await requireWorkspace(ctx);
    const row = await ctx.db.query("aiKeys").withIndex("by_user", (q) => q.eq("userId", workspace.userId)).unique();
    if (row) await ctx.db.delete(row._id);
  },
});

/** Maps one uploaded file onto a release's checklist, verified in code. */
export const structureFile = action({
  args: { releaseId: v.id("releases"), fileName: v.string(), text: v.string() },
  handler: async (ctx, { releaseId, fileName, text }): Promise<StructuredFile> => {
    const workspace = await requireWorkspace(ctx);
    if (!uploadKind(fileName)) throw new ConvexError("Upload .csv or .tsv tables, or .txt or .md documents.");
    if (text.length > MAX_UPLOAD_CHARS) throw new ConvexError("Files are limited to 2 MB.");
    const release: Doc<"releases"> | null = await ctx.runQuery(internal.ai.releaseFor, { releaseId, workspaceId: workspace.id });
    if (!release) throw new ConvexError("Release not found");
    const ai = await loadConfig(ctx, workspace);
    return structureWithAi(loggedAsk(ctx, ai, workspace, "import", releaseId), importTargets(release), {
      name: fileName.slice(0, 160),
      text,
    });
  },
});

/** Judges every document gate, drafts the memo and records the check. */
export const runReview = action({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, { releaseId }): Promise<Id<"evaluations">> => {
    const workspace = await requireWorkspace(ctx);
    const release: Doc<"releases"> | null = await ctx.runQuery(internal.ai.releaseFor, { releaseId, workspaceId: workspace.id });
    if (!release) throw new ConvexError("Release not found");
    const ai = await loadConfig(ctx, workspace);
    const { verdicts, memo } = await runAiReview(loggedAsk(ctx, ai, workspace, "review", releaseId), release);
    return ctx.runMutation(internal.evaluations.recordFromServer, {
      releaseId, workspaceId: workspace.id, userId: workspace.userId, verdicts, memo, model: ai.model,
    });
  },
});

/** The caller's recent AI activity, for Settings. Metadata only. */
export const recentLogs = query({
  args: {},
  handler: async (ctx) => {
    const workspace = await getWorkspace(ctx);
    if (!workspace) return [];
    return ctx.db
      .query("aiLogs")
      .withIndex("by_user", (q) => q.eq("userId", workspace.userId))
      .order("desc")
      .take(25);
  },
});

export type { Provider };
