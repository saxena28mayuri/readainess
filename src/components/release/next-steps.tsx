"use client";

import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { recommendationLabel, timeAgo } from "@/lib/format";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { Release } from "@/lib/readiness/types";
import { Button, buttonVariants } from "@/components/ui/button";

type State = "done" | "current" | "todo" | "attention";

interface Step {
  title: string;
  status: string;
  state: State;
  action?: React.ReactNode;
}

/** The gates with no evidence on file yet, by their kind of signal. */
function gatesWithoutEvidence(release: Release) {
  const s = release.signals;
  return release.gates
    .map((g, i) => ({ g, n: i + 1 }))
    .filter(({ g }) =>
      !(g.kind === "metric" ? g.metric.signal in s.metrics : g.kind === "signoff" ? g.signoff.role in s.signoffs : g.document.document in s.documents),
    );
}

/**
 * The four things a release owner does, each with what has happened and the
 * one action that moves it on. The first step that is not done is the one
 * to do now.
 */
export function NextSteps({
  release,
  slug,
  canEdit,
  checkedAt,
  evaluationId,
  decisions,
  hasKey,
  running,
  onRunCheck,
}: {
  release: Release & { lastChange?: { at: number; kind: "import" | "checklist"; summary: string; files?: string[] } };
  slug: string;
  canEdit: boolean;
  checkedAt?: number;
  evaluationId?: Id<"evaluations">;
  decisions: Doc<"decisions">[] | undefined;
  hasKey: boolean;
  running: boolean;
  onRunCheck: () => void;
}) {
  const total = release.gates.length;
  const missing = gatesWithoutEvidence(release);
  const withEvidence = total - missing.length;
  const missingText =
    missing.length === 0
      ? ""
      : missing.length <= 2
        ? `${missing.map((m) => `G${m.n} ${m.g.title}`).join(" and ")} ${missing.length === 1 ? "has" : "have"} none yet; ${missing.length === 1 ? "it" : "they"} will show as Unknown.`
        : `${missing.length} gates have none yet; they will show as Unknown.`;
  const change = release.lastChange;
  const stale = !!change && !!checkedAt && checkedAt < change.at;
  const decision = decisions?.[0];
  const decidedThisCheck = !!decision && decision.evaluationId === evaluationId;

  const steps: Step[] = [
    {
      title: "Agree the gates",
      status: `${total} gate${total === 1 ? "" : "s"} on the checklist${change?.kind === "checklist" ? `, edited ${timeAgo(change.at)}` : ""}`,
      state: "done",
      action: (
        <Link href={`/releases/${slug}/gates`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          {canEdit ? "Edit" : "View"}
        </Link>
      ),
    },
    {
      title: "Bring the evidence",
      // Partial evidence is enough to run a check: gates without it show as
      // Unknown, so the next step moves on as soon as anything is imported.
      status:
        withEvidence === 0
          ? "No evidence yet. Import exports, sign-off sheets or documents."
          : `${withEvidence} of ${total} gates have evidence${change?.kind === "import" ? ` · imported ${timeAgo(change.at)}: ${change.summary}` : ""}. ${missingText}`.trim(),
      state: withEvidence === 0 ? "todo" : "done",
      action: canEdit ? (
        <Link href={`/releases/${slug}/import`} className={buttonVariants({ variant: withEvidence === 0 ? "default" : "ghost", size: "sm" })}>
          {withEvidence === 0 ? "Import data" : "Import more"}
        </Link>
      ) : undefined,
    },
    {
      title: "Run the readiness check",
      status: !checkedAt
        ? hasKey
          ? "Not run yet. AI reads the documents and drafts the brief; rules check the rest."
          : "Not run yet. Without an AI key, documents are not reviewed."
        : stale
          ? `Out of date: ${change!.kind === "import" ? `${change!.summary} imported` : "checklist edited"} ${timeAgo(change!.at)}, after the last check`
          : `Up to date · ran ${timeAgo(checkedAt)}. Run it again only after importing new data or editing the checklist; the same data gives the same result.`,
      state: !checkedAt ? "todo" : stale ? "attention" : "done",
      // A fresh check on unchanged data repeats the last one, so the button
      // only appears when there is something new to check.
      action:
        !checkedAt || stale ? (
          <Button size="sm" onClick={onRunCheck} disabled={running}>
            {running && <Loader2 className="animate-spin" aria-hidden />}
            {running ? "Running…" : checkedAt ? "Run again" : "Run check"}
          </Button>
        ) : undefined,
    },
    {
      title: "Record the decision",
      status: decidedThisCheck
        ? `${recommendationLabel[decision!.decision]} recorded by ${decision!.decidedBy} ${timeAgo(decision!._creationTime)}`
        : decision
          ? `Last decision (${recommendationLabel[decision.decision]}) was for an earlier check`
          : checkedAt
            ? "Not recorded yet"
            : "Available after a readiness check",
      state: decidedThisCheck ? "done" : "todo",
      action: checkedAt && !decidedThisCheck ? (
        <a href="#decision-heading" className={buttonVariants({ variant: "outline", size: "sm" })}>Record</a>
      ) : undefined,
    },
  ];
  // The first unfinished step is the one to do now.
  const now = steps.findIndex((s) => s.state !== "done");
  if (now >= 0 && steps[now].state === "todo") steps[now].state = "current";

  return (
    <section aria-labelledby="steps-heading" className="mt-6 rounded-lg border bg-sheet">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
        <h2 id="steps-heading" className="text-base font-semibold">Next steps</h2>
        <p className="text-xs text-muted-foreground">
          {now === -1 ? "All done for this release." : `Now: ${steps[now].title.toLowerCase()}`}
          {change?.files && change.files.length > 0 && (
            <span title={change.files.join("\n")}> · last import: {change.files.length} file{change.files.length === 1 ? "" : "s"}</span>
          )}
        </p>
      </div>
      <ol className="grid divide-y divide-rule md:grid-cols-4 md:divide-x md:divide-y-0">
        {steps.map((s, i) => (
          <li
            key={s.title}
            aria-current={s.state === "current" || s.state === "attention" ? "step" : undefined}
            className={cn("flex flex-col gap-2 px-4 py-3", (s.state === "current" || s.state === "attention") && "bg-pencil-soft/60")}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  s.state === "done" ? "bg-go-soft text-go" : s.state === "attention" ? "bg-cond-soft text-cond" : s.state === "current" ? "bg-pencil text-white" : "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {s.state === "done" ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="text-[14px] font-medium">{s.title}</span>
            </div>
            <p className={cn("text-[13px] leading-5", s.state === "attention" ? "text-cond" : "text-muted-foreground")}>{s.status}</p>
            {s.action && <div className="mt-auto">{s.action}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}
