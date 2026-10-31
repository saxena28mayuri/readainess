"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  describeDaysUntil,
  formatDate,
  releaseTypeLabel,
  timeAgo,
} from "@/lib/format";
import { currentView, useReleases } from "@/lib/use-checks";
import { RecommendationTag } from "@/components/verdict";
import { Runway } from "@/components/release/runway";

export default function ReleasesPage() {
  const { releases, latest, decisions } = useReleases();
  // The person's decision is the release's call; the tool's recommendation is advice.
  const views = (releases ?? []).map((r) => ({
    release: r,
    view: currentView(r, latest?.[r._id]),
    call: decisions?.[r._id]?.decision,
  }));
  const noGo = views.filter((v) => (v.call ?? v.view.evaluation.recommendation) === "no-go").length;
  const next = [...views].sort((a, b) => a.release.targetDate.localeCompare(b.release.targetDate))[0];
  const finding =
    releases === undefined
      ? "Loading releases…"
      : releases.length === 0
        ? "No releases yet. Create one to agree its gates."
        : `${noGo} of ${releases.length} release${releases.length === 1 ? " is" : "s are"} No-Go${next ? ` · next target date ${formatDate(next.release.targetDate)}, ${next.release.name}` : ""}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Releases
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{finding}</p>
        </div>
        <Link href="/releases/new" className={buttonVariants({ size: "lg", className: "px-3.5" })}>
          <Plus aria-hidden /> New release
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border bg-sheet">
        <table className="w-full text-left text-sm max-md:block md:min-w-[720px]">
          <caption className="sr-only">Releases and their readiness</caption>
          <thead className="max-md:hidden">
            <tr className="border-b text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-medium">Release</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Recommendation</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Decision</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Target date</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Blockers</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Gates passing</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Last check</th>
              <th scope="col" className="w-8 px-2"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody className="max-md:block">
            {releases === undefined
              ? [0, 1, 2].map((i) => (
                  <tr key={i} className="border-b border-rule last:border-0 max-md:block">
                    <td colSpan={8} className="px-4 py-4 max-md:block">
                      <div className="h-4 w-1/2 rounded bg-muted" />
                    </td>
                  </tr>
                ))
              : releases.map((release) => {
                  const view = currentView(release, latest?.[release._id]);
                  const { evaluation } = view;
                  const decision = decisions?.[release._id];
                  // A decision made on an older check no longer matches what the gates say now.
                  const decidedOnEarlier = !!decision && !!view.evaluationId && decision.evaluationId !== view.evaluationId;
                  const passing = evaluation.results.filter(
                    (r) => r.status === "pass",
                  ).length;
                  const href = `/releases/${release.slug}`;
                  return (
                    <tr
                      key={release._id}
                      className="group relative border-b border-rule transition-colors last:border-0 hover:bg-muted/60 max-md:grid max-md:grid-cols-[1fr_auto] max-md:gap-x-4 max-md:gap-y-1 max-md:px-4 max-md:py-3.5"
                    >
                      <td className="px-4 py-3.5 max-md:p-0">
                        <Link
                          href={href}
                          className="font-medium after:absolute after:inset-0 focus-visible:outline-none group-has-[a:focus-visible]:underline"
                        >
                          {release.name}
                        </Link>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {releaseTypeLabel[release.type]}
                          {!release.isSample && <span> · Yours</span>}
                          <span className="md:hidden">
                            {" "}· {evaluation.blockers.length} blocking ·{" "}
                            {passing}/{evaluation.results.length} gates passing
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 max-md:p-0 max-md:text-right">
                        <RecommendationTag value={evaluation.recommendation} />
                      </td>
                      <td className="px-4 py-3.5 max-md:col-span-2 max-md:p-0">
                        {decision ? (
                          <>
                            <RecommendationTag value={decision.decision} />
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {decision.decidedBy} · {timeAgo(decision._creationTime)}
                              {decision.overrode && <span className="font-medium text-cond"> · Override</span>}
                              {decidedOnEarlier && " · before the latest check"}
                            </div>
                          </>
                        ) : (
                          <span className="text-[13px] text-muted-foreground">Not decided</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 tabular max-md:col-span-2 max-md:p-0 max-md:text-[13px]">
                        {formatDate(release.targetDate)}
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {describeDaysUntil(release.targetDate)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums max-md:hidden">
                        {evaluation.blockers.length}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums max-md:hidden">
                        {passing}/{evaluation.results.length}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground max-md:hidden">
                        {view.checkedAt ? timeAgo(view.checkedAt) : "Sample check"}
                      </td>
                      <td className="px-2 py-3.5 text-muted-foreground max-md:hidden">
                        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {releases && releases.length > 0 && <Runway items={views} />}

      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        Sample releases, people and figures are synthetic. Releases you create or copy, and the checks and decisions you
        record, belong to your account.
      </p>
    </div>
  );
}
