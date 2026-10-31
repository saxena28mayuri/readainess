import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { getWorkspace, requireWorkspace } from "./workspace";
import { sampleReleases } from "../src/lib/readiness/samples";
import { releaseTemplates } from "../src/lib/readiness/templates";
import { gate as gateValidator, releaseType, signals as signalsValidator } from "./schema";
import { LIMITS, describeSignals, mergeSignals, stampMeta } from "../src/lib/readiness/merge";


/** Samples plus the releases the current workspace created or copied. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const workspace = await getWorkspace(ctx);
    const samples = (await ctx.db.query("releases").collect()).filter(
      (r) => r.isSample,
    );
    if (!workspace) return samples.map((r) => ({ ...r, canEdit: false }));
    const own = await ctx.db
      .query("releases")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace.id))
      .collect();
    return [
      ...own.reverse().map((r) => ({ ...r, canEdit: true })),
      ...samples.map((r) => ({ ...r, canEdit: false })),
    ];
  },
});

/** A sample, or a release in the current workspace. Others read as missing. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const release = await ctx.db
      .query("releases")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!release) return null;
    if (release.isSample) return { ...release, canEdit: false };
    const workspace = await getWorkspace(ctx);
    if (!workspace || release.workspaceId !== workspace.id) return null;
    return { ...release, canEdit: true };
  },
});

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "release"}-${suffix}`;
}

async function ownedRelease(
  ctx: MutationCtx,
  releaseId: Doc<"releases">["_id"],
  workspaceId: string,
) {
  const release = await ctx.db.get(releaseId);
  if (!release) throw new Error("Release not found");
  if (release.isSample) throw new Error("Sample releases are read-only. Make a copy to edit it.");
  // Someone else's release reads as missing, so its existence is not revealed.
  if (release.workspaceId !== workspaceId) throw new Error("Release not found");
  return release;
}

/**
 * Creates a release with no data yet. Its checklist comes from the template
 * for its type, or is copied from another release's gates (never its data).
 */
export const create = mutation({
  args: {
    name: v.string(),
    type: releaseType,
    targetDate: v.string(),
    summary: v.string(),
    copyGatesFrom: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx);
    const name = args.name.trim().slice(0, LIMITS.name);
    if (!name) throw new Error("Give the release a name");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.targetDate)) {
      throw new Error("Choose a target date");
    }
    let gates = releaseTemplates[args.type];
    if (args.copyGatesFrom) {
      const source = await ctx.db
        .query("releases")
        .withIndex("by_slug", (q) => q.eq("slug", args.copyGatesFrom!))
        .unique();
      if (!source || (!source.isSample && source.workspaceId !== workspace.id)) {
        throw new Error("Release to copy from not found");
      }
      gates = source.gates;
    }
    const slug = slugify(name);
    await ctx.db.insert("releases", {
      slug,
      name,
      type: args.type,
      targetDate: args.targetDate,
      summary: args.summary.trim().slice(0, LIMITS.summary),
      gates,
      signals: { metrics: {}, signoffs: {}, documents: {} },
      isSample: false,
      workspaceId: workspace.id,
    });
    return slug;
  },
});

/** Makes an editable copy of a sample or own release in this workspace. */
export const duplicate = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const workspace = await requireWorkspace(ctx);
    const source = await ctx.db
      .query("releases")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!source || (!source.isSample && source.workspaceId !== workspace.id)) {
      throw new Error("Release not found");
    }
    const newSlug = slugify(source.name);
    await ctx.db.insert("releases", {
      slug: newSlug,
      name: `${source.name} (copy)`.slice(0, LIMITS.name),
      type: source.type,
      targetDate: source.targetDate,
      summary: source.summary,
      gates: source.gates,
      signals: source.signals,
      signalMeta: source.signalMeta,
      isSample: false,
      workspaceId: workspace.id,
      copiedFrom: source.copiedFrom ?? source.slug,
    });
    return newSlug;
  },
});

/**
 * Merges imported signals into a release the current workspace owns. Values given
 * replace existing ones with the same key; nothing else is touched.
 */
export const applyImport = mutation({
  args: {
    releaseId: v.id("releases"),
    signals: signalsValidator,
    files: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { releaseId, signals, files }) => {
    const workspace = await requireWorkspace(ctx);
    const release = await ownedRelease(ctx, releaseId, workspace.id);

    const merged = mergeSignals(release.signals, signals);
    const { counts, summary } = describeSignals(signals);
    const at = Date.now();
    const source = files?.slice(0, 5).map((f) => f.slice(0, 80)).join(", ") || undefined;
    await ctx.db.patch(release._id, {
      signals: merged,
      signalMeta: stampMeta(release.signalMeta, signals, at, source),
      lastChange: {
        at,
        kind: "import",
        summary,
        files: files?.slice(0, 20).map((f) => f.slice(0, 160)),
      },
    });
    return counts;
  },
});

/**
 * Records a sign-in-app approval, rejection or reset for a role on this
 * release. Only roles a gate asks for can be signed, and every change is kept
 * in the sign-off log with who made it.
 */
export const recordSignoff = mutation({
  args: {
    releaseId: v.id("releases"),
    role: v.string(),
    status: v.union(v.literal("approved"), v.literal("pending"), v.literal("rejected")),
    note: v.optional(v.string()),
    byName: v.optional(v.string()),
  },
  handler: async (ctx, { releaseId, role, status, note, byName }) => {
    const workspace = await requireWorkspace(ctx);
    const release = await ownedRelease(ctx, releaseId, workspace.id);
    if (!release.gates.some((g) => g.kind === "signoff" && g.signoff.role === role)) {
      throw new Error(`No gate asks for a "${role.slice(0, 40)}" sign-off`);
    }
    const by = (byName?.trim() || "Team member").slice(0, 80);
    const text = note?.trim().slice(0, 300) || undefined;
    if (status === "rejected" && !text) throw new Error("Say why you are rejecting, so the team can act on it");
    const at = Date.now();
    await ctx.db.insert("signoffEvents", { releaseId, workspaceId: workspace.id, role, status, by, byId: workspace.userId, note: text });
    await ctx.db.patch(release._id, {
      signals: { ...release.signals, signoffs: { ...release.signals.signoffs, [role]: { status, by, note: text } } },
      signalMeta: { ...release.signalMeta, [`signoff:${role}`]: { at, source: `Signed in ReadAIness by ${by}` } },
      lastChange: { at, kind: "signoff", summary: `${role} ${status}` },
    });
  },
});

/** The sign-off log for one release, newest first. */
export const signoffLog = query({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, { releaseId }) => {
    const workspace = await getWorkspace(ctx);
    if (!workspace) return [];
    const rows = await ctx.db
      .query("signoffEvents")
      .withIndex("by_release_workspace", (q) => q.eq("releaseId", releaseId).eq("workspaceId", workspace.id))
      .order("desc")
      .take(30);
    return rows.map((r) => ({ id: r._id, at: r._creationTime, role: r.role, status: r.status, by: r.by, note: r.note }));
  },
});

/**
 * Removes one imported value, for example after its gate was renamed or
 * dropped. The gate that used it reads Unknown again until re-imported.
 */
export const removeSignal = mutation({
  args: {
    releaseId: v.id("releases"),
    group: v.union(v.literal("metric"), v.literal("signoff"), v.literal("document")),
    key: v.string(),
  },
  handler: async (ctx, { releaseId, group, key }) => {
    const workspace = await requireWorkspace(ctx);
    const release = await ownedRelease(ctx, releaseId, workspace.id);
    const signals = {
      metrics: { ...release.signals.metrics },
      signoffs: { ...release.signals.signoffs },
      documents: { ...release.signals.documents },
    };
    const bucket = group === "metric" ? signals.metrics : group === "signoff" ? signals.signoffs : signals.documents;
    if (!(key in bucket)) throw new Error("That value is not on file");
    delete (bucket as Record<string, unknown>)[key];
    const signalMeta = { ...release.signalMeta };
    delete signalMeta[`${group}:${key}`];
    await ctx.db.patch(release._id, {
      signals,
      signalMeta,
      lastChange: { at: Date.now(), kind: "import", summary: `removed ${group} "${key.slice(0, 40)}"` },
    });
  },
});

const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9 _-]{0,47}$/;

/**
 * Replaces a release's checklist. Gates are validated here so a client
 * cannot save something the rules engine cannot evaluate. Signals already
 * imported are kept, so removing and re-adding a gate does not lose data.
 */
export const updateGates = mutation({
  args: { releaseId: v.id("releases"), gates: v.array(gateValidator) },
  handler: async (ctx, { releaseId, gates }) => {
    const workspace = await requireWorkspace(ctx);
    const release = await ownedRelease(ctx, releaseId, workspace.id);
    if (gates.length === 0) throw new Error("A release needs at least one gate");
    if (gates.length > 25) throw new Error("A release can have at most 25 gates");
    const ids = new Set<string>();
    for (const g of gates) {
      if (!/^[a-z0-9-]{1,48}$/.test(g.id) || ids.has(g.id)) throw new Error(`Gate id "${g.id.slice(0, 40)}" is invalid or repeated`);
      ids.add(g.id);
      if (!g.title.trim() || g.title.length > 120) throw new Error("Every gate needs a title under 120 characters");
      if (!g.owner.trim() || g.owner.length > 60) throw new Error(`"${g.title}": add an owner (under 60 characters)`);
      if (g.kind === "metric") {
        if (!KEY_PATTERN.test(g.metric.signal)) throw new Error(`"${g.title}": the metric name must start with a letter and use letters, numbers, spaces, - or _`);
        if (!Number.isFinite(g.metric.target)) throw new Error(`"${g.title}": the target must be a number`);
        if (g.metric.unit && g.metric.unit.length > 8) throw new Error(`"${g.title}": the unit is too long`);
      } else if (g.kind === "document") {
        if (!KEY_PATTERN.test(g.document.document)) throw new Error(`"${g.title}": the document name must start with a letter`);
        if (g.document.question.trim().length < 10 || g.document.question.length > 400) throw new Error(`"${g.title}": write the question the document must answer (10 to 400 characters)`);
      } else if (!KEY_PATTERN.test(g.signoff.role)) {
        throw new Error(`"${g.title}": the sign-off role must start with a letter`);
      }
    }
    await ctx.db.patch(release._id, {
      gates: gates.map((g) => ({ ...g, title: g.title.trim(), owner: g.owner.trim() })),
      lastChange: { at: Date.now(), kind: "checklist", summary: `${gates.length} gates` },
    });
  },
});

/**
 * Deletes a release the current workspace owns, with its checks and decision
 * log. Samples cannot be deleted. AI activity logs keep their metadata.
 */
export const remove = mutation({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, { releaseId }) => {
    const workspace = await requireWorkspace(ctx);
    const release = await ownedRelease(ctx, releaseId, workspace.id);
    const evaluations = await ctx.db
      .query("evaluations")
      .withIndex("by_release_workspace", (q) => q.eq("releaseId", releaseId).eq("workspaceId", workspace.id))
      .collect();
    const decisions = await ctx.db
      .query("decisions")
      .withIndex("by_release_workspace", (q) => q.eq("releaseId", releaseId).eq("workspaceId", workspace.id))
      .collect();
    const signoffs = await ctx.db
      .query("signoffEvents")
      .withIndex("by_release_workspace", (q) => q.eq("releaseId", releaseId).eq("workspaceId", workspace.id))
      .collect();
    for (const row of [...decisions, ...evaluations, ...signoffs]) await ctx.db.delete(row._id);
    await ctx.db.delete(release._id);
    return { evaluations: evaluations.length, decisions: decisions.length };
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
