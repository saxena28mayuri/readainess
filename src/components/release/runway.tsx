"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { daysUntil, formatDate, recommendationLabel } from "@/lib/format";
import type { Recommendation, Release } from "@/lib/readiness/types";
import type { CheckView } from "@/lib/use-checks";

const dotTone: Record<Recommendation, string> = { go: "bg-go", conditional: "bg-cond", "no-go": "bg-nogo" };
const textTone: Record<Recommendation, string> = { go: "text-go", conditional: "text-cond", "no-go": "text-nogo" };

/**
 * The runway: each release on one axis from today to its target date,
 * marked with its current call, so the No-Go due soonest is seen first.
 */
export function Runway({ items }: { items: { release: Release & { slug: string }; view: CheckView }[] }) {
  const rows = items
    .map((i) => ({ ...i, days: daysUntil(i.release.targetDate) }))
    .sort((a, b) => a.days - b.days);
  const span = Math.max(28, Math.ceil((Math.max(...rows.map((r) => r.days), 0) + 4) / 7) * 7);
  const ticks = Array.from({ length: span / 7 + 1 }, (_, i) => i * 7);
  const at = (d: number) => `${(Math.min(Math.max(d, 0), span) / span) * 100}%`;
  const dateIn = (d: number) => {
    const t = new Date();
    t.setDate(t.getDate() + d);
    return t.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <section aria-labelledby="runway-h" className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="runway-h" className="text-base font-semibold">Runway to target dates</h2>
        <p className="text-xs text-muted-foreground">Today to {dateIn(span)} · marked with each release’s current call</p>
      </div>
      <div className="mt-3 rounded-lg border bg-sheet px-4 py-4">
        <div className="grid grid-cols-[minmax(120px,220px)_minmax(0,1fr)] gap-x-4">
          <span />
          <div className="relative h-5 text-[12px] text-muted-foreground">
            {ticks.map((t) => (
              <span key={t} className={cn("absolute top-0 whitespace-nowrap", t === 0 ? "" : t === span ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: at(t) }}>
                {t === 0 ? "Today" : dateIn(t)}
              </span>
            ))}
          </div>
          {rows.map(({ release, view, days }) => {
            const rec = view.evaluation.recommendation;
            return (
              <div key={release.slug} className="contents">
                <div className="min-w-0 py-2.5">
                  <Link href={`/releases/${release.slug}`} className="block truncate text-[13px] font-medium hover:underline">
                    {release.name}
                  </Link>
                  <p className="text-[13px] sm:hidden">
                    <span className={cn("font-medium", textTone[rec])}>{recommendationLabel[rec]}</span>
                    <span className="text-muted-foreground"> · in {days} days</span>
                  </p>
                </div>
                <div className="relative py-2.5">
                  <div className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-border" aria-hidden />
                  <div className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full bg-pencil/25" style={{ width: at(days) }} aria-hidden />
                  <div className="relative h-5">
                    <span className={cn("absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-sheet", dotTone[rec])} style={{ left: at(days) }} aria-hidden />
                    <span
                      className={cn("absolute top-1/2 hidden -translate-y-1/2 bg-sheet px-1.5 text-[13px] whitespace-nowrap sm:block", days / span > 0.55 ? "-translate-x-[calc(100%+8px)]" : "translate-x-2")}
                      style={{ left: at(days) }}
                    >
                      <span className={cn("font-medium", textTone[rec])}>{recommendationLabel[rec]}</span>
                      <span className="text-muted-foreground"> · {formatDate(release.targetDate)}, {days === 0 ? "today" : `in ${days} days`}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
