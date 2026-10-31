"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { CalendarDays, ListChecks, Loader2, Play, Upload } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { describeDaysUntil, formatDate, releaseTypeLabel, timeAgo } from "@/lib/format";
import { errorText, useAiKey } from "@/lib/settings";
import { currentView, demoFor, useReleaseDetail } from "@/lib/use-checks";
import { Button, buttonVariants } from "@/components/ui/button";
import { Opinion } from "@/components/release/opinion";
import { GateTable } from "@/components/release/gate-table";
import { HistoryStrip } from "@/components/release/history-strip";
import { Memo } from "@/components/release/memo";
import { DecisionPanel } from "@/components/release/decision-panel";
import { PageGuide } from "@/components/release/page-guide";
import { DeleteRelease } from "@/components/release/delete-release";
import { NextSteps } from "@/components/release/next-steps";

export default function ReleasePage() {
  const { slug } = useParams<{ slug: string }>();
  const { release, history, decisions, signedIn } = useReleaseDetail(slug);
  const { hasKey, model } = useAiKey();
  const runReview = useAction(api.ai.runReview);
  const recordCheck = useMutation(api.evaluations.record);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  if (release === undefined) {
    return (
      <div className="mx-auto w-full max-w-[1680px] space-y-4 px-4 py-8 sm:px-8" aria-busy>
        <h1 className="text-2xl font-semibold tracking-tight text-muted-foreground">Loading release…</h1>
        <div className="h-24 rounded-lg bg-secondary/70" />
        <div className="h-80 rounded-lg bg-secondary/50" />
      </div>
    );
  }

  if (release === null) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Release not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          There is no release at this address.
        </p>
        <Link href="/releases" className="mt-4 inline-block text-sm font-medium text-pencil underline">
          Back to all releases
        </Link>
      </div>
    );
  }

  const view = currentView(release, history?.[0]);
  const s = release.signals;
  const evidence = [
    [Object.keys(s.metrics).length, "metric"],
    [Object.keys(s.signoffs).length, "sign-off"],
    [Object.keys(s.documents).length, "document"],
  ] as const;
  const onFile = evidence.filter(([n]) => n > 0).map(([n, w]) => `${n} ${w}${n === 1 ? "" : "s"}`).join(", ");
  const change = release.lastChange;
  // Up to date: a recorded check that is newer than the last change.
  const upToDate = !!view.checkedAt && (!change || view.checkedAt >= change.at);

  async function runCheck() {
    if (!release || !signedIn) return;
    setError(null);
    setRunning(true);
    try {
      if (hasKey) {
        // The server reviews with the user's stored key and records the check.
        await runReview({ releaseId: release._id });
      } else {
        const demo = demoFor(release);
        await recordCheck({ releaseId: release._id, verdicts: demo?.verdicts ?? [], memo: demo?.memo });
      }
    } catch (err) {
      setError(errorText(err, "The check did not complete."));
    } finally {
      setRunning(false);
    }
  }

  function cite(gateId: string) {
    setHighlight(gateId);
    window.setTimeout(() => setHighlight((h) => (h === gateId ? null : h)), 1800);
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-8 lg:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
            <Link href="/releases" className="hover:text-foreground hover:underline">
              Releases
            </Link>
            <span aria-hidden> / </span>
            <span>{releaseTypeLabel[release.type]}</span>
            <span aria-hidden> · </span>
            <span>{release.isSample ? "Sample, read-only" : "Yours, editable"}</span>
          </nav>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">
            {release.name}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden />
              <span className="tabular">{formatDate(release.targetDate)}</span>
              <span>({describeDaysUntil(release.targetDate)})</span>
            </span>
            <span aria-hidden>·</span>
            <span>{release.gates.length} gates</span>
            <span aria-hidden>·</span>
            <span>Evidence on file: {onFile || "none yet"}</span>
            {change && (
              <>
                <span aria-hidden>·</span>
                <span>{change.kind === "import" ? "Last import" : "Checklist edited"} {timeAgo(change.at)}</span>
              </>
            )}
          </p>
          <p className="mt-2 max-w-[70ch] text-sm leading-6">{release.summary}</p>
        </div>

        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <div className="flex flex-wrap gap-2">
          {release.canEdit && (
            <DeleteRelease
              releaseId={release._id}
              name={release.name}
              checks={history?.length ?? 0}
              decisions={decisions?.length ?? 0}
            />
          )}
          <Link
            href={`/releases/${release.slug}/gates`}
            className={buttonVariants({ variant: "ghost", size: "lg", className: "px-3" })}
          >
            <ListChecks aria-hidden />
            {release.canEdit ? "Edit checklist" : "Checklist"}
          </Link>
          <Link
            href={`/releases/${release.slug}/import`}
            className={buttonVariants({ variant: "outline", size: "lg", className: "px-3.5" })}
          >
            <Upload aria-hidden />
            Import data
          </Link>
          <Button
            size="lg"
            variant={upToDate ? "outline" : "default"}
            onClick={runCheck}
            disabled={running || !signedIn}
            className="px-3.5"
            title={upToDate ? "Nothing has changed since the last check" : undefined}
          >
            {running ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Play aria-hidden />
            )}
            {running ? (hasKey ? "Reviewing documents and drafting the brief…" : "Running check…") : upToDate ? "Run again" : "Run readiness check"}
          </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasKey ? (
              <>AI review with <span className="font-mono">{model}</span></>
            ) : (
              <>
                Demo results.{" "}
                <Link href="/settings" className="font-medium text-pencil underline">
                  Add your key
                </Link>{" "}
                for live AI review.
              </>
            )}
          </p>
        </div>
      </header>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-nogo/30 bg-nogo-soft px-4 py-2.5 text-sm text-nogo">
          {error}
        </p>
      )}

      {/* From xl the memo and decision sit beside the gates; below that they
          follow the gates, in reading order. */}
      <NextSteps
        release={release}
        slug={release.slug}
        canEdit={release.canEdit}
        checkedAt={view.checkedAt}
        evaluationId={view.evaluationId}
        decisions={decisions}
        hasKey={hasKey}
        running={running}
        onRunCheck={runCheck}
      />

      <PageGuide checklistHref={`/releases/${release.slug}/gates`} />

      <div className="mt-6 grid gap-6 min-[1600px]:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-8">
          <Opinion release={release} view={view} />
          <GateTable
            release={release}
            results={view.evaluation.results}
            animationKey={view.evaluationId ?? "sample"}
            highlight={highlight}
          />
          {history && <HistoryStrip release={release} history={history} />}
        </div>
        <aside className="grid items-start gap-6 lg:max-[1599px]:grid-cols-2 min-[1600px]:sticky min-[1600px]:top-6 min-[1600px]:self-start">
          <Memo
            release={release}
            evaluation={view.evaluation}
            memo={view.memo}
            model={view.model}
            onCite={cite}
          />
          <DecisionPanel
            key={view.evaluationId ?? "sample"}
            releaseId={release._id}
            canDecide={signedIn}
            evaluationId={view.evaluationId}
            recommendation={view.evaluation.recommendation}
            decisions={decisions}
            onRunCheck={runCheck}
            running={running}
          />
        </aside>
      </div>
    </div>
  );
}
