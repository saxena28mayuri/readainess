"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { demoReviews } from "@/lib/readiness/demo";
import {
  evaluateGate,
  evaluateRelease,
  rollUp,
} from "@/lib/readiness/evaluate";
import { sampleReleases } from "@/lib/readiness/samples";
import type { DocumentVerdict, Evaluation, Release } from "@/lib/readiness/types";

export type ReleaseDoc = Doc<"releases">;
export type EvaluationDoc = Doc<"evaluations">;

export interface CheckView {
  evaluation: Evaluation;
  memo?: string;
  /**
   * "recorded": a check this browser ran. "sample": the precomputed demo.
   * "unchecked": a new release nobody has checked yet.
   */
  source: "recorded" | "sample" | "unchecked";
  model?: string;
  checkedAt?: number;
  evaluationId?: Id<"evaluations">;
}

export function viewFromEvaluation(
  release: Release,
  row: EvaluationDoc,
): CheckView {
  // Metric and sign-off gates are deterministic, so they are re-derived from
  // the release (keeping wording current); only the AI's document verdicts
  // come from the stored check.
  const stored = new Map(row.results.map((r) => [r.gateId, r]));
  const results = release.gates.map((gate) =>
    gate.kind === "document" && stored.has(gate.id)
      ? stored.get(gate.id)!
      : evaluateGate(gate, release, new Map()),
  );
  return {
    evaluation: rollUp(release, results),
    memo: row.memo,
    source: "recorded",
    model: row.model,
    checkedAt: row._creationTime,
    evaluationId: row._id,
  };
}

/**
 * Demo AI results for a sample, or for a copy of one. Each canned verdict
 * is kept only while its document is unchanged, and the canned memo only
 * while every signal is unchanged; imported data needs a real AI review.
 */
export function demoFor(release: Release & { copiedFrom?: string }) {
  const key = release.copiedFrom ?? release.slug;
  const demo = demoReviews[key];
  const original = sampleReleases.find((r) => r.slug === key);
  if (!demo || !original) return undefined;
  if (!release.copiedFrom) return demo;
  const docGates = new Map(
    release.gates.flatMap((g) => (g.kind === "document" ? [[g.id, g.document.document]] : [])),
  );
  const verdicts = demo.verdicts.flatMap((v): DocumentVerdict[] => {
    const slot = docGates.get(v.gateId);
    const unchanged =
      slot !== undefined &&
      release.signals.documents[slot]?.content === original.signals.documents[slot]?.content;
    return unchanged
      ? [v]
      : [{ gateId: v.gateId, status: "unknown", reason: "Imported document. Add an AI key in Settings to review it." }];
  });
  const untouched = JSON.stringify(release.signals) === JSON.stringify(original.signals);
  return { verdicts, memo: untouched ? demo.memo : undefined };
}

/**
 * What a release shows before this browser has run a check: the sample
 * check for samples and their copies, otherwise the rules engine alone.
 */
export function sampleView(release: Release & { copiedFrom?: string }): CheckView {
  const demo = demoFor(release);
  return {
    evaluation: evaluateRelease(release, demo?.verdicts ?? []),
    memo: demo?.memo,
    source: demo ? "sample" : "unchecked",
  };
}

export function currentView(
  release: Release & { copiedFrom?: string },
  latest: EvaluationDoc | undefined,
): CheckView {
  return latest ? viewFromEvaluation(release, latest) : sampleView(release);
}

// Queries wait for the Clerk session so the first result is already scoped
// to the signed-in workspace rather than flashing the signed-out view.

export function useReleases() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ready = !isLoading;
  const releases = useQuery(api.releases.list, ready ? {} : "skip");
  const latest = useQuery(
    api.evaluations.latestForWorkspace,
    ready && isAuthenticated ? {} : "skip",
  );
  const decisions = useQuery(
    api.decisions.latestForWorkspace,
    ready && isAuthenticated ? {} : "skip",
  );
  return { releases, latest, decisions, signedIn: isAuthenticated };
}

export function useReleaseDetail(slug: string) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const release = useQuery(api.releases.getBySlug, isLoading ? "skip" : { slug });
  const args = release && isAuthenticated ? { releaseId: release._id } : "skip";
  const history = useQuery(api.evaluations.history, args);
  const decisions = useQuery(api.decisions.list, args);
  return { release, history, decisions, signedIn: isAuthenticated };
}
