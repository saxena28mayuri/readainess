"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { gateKindLabel } from "@/lib/format";
import type { Gate, GateResult, Release } from "@/lib/readiness/types";
import { GateStatusMark } from "@/components/verdict";

/**
 * Display-only tidy-up for quotes taken from Markdown tables: "| a | b |"
 * reads as "a · b". The stored quote is unchanged, so verification is too.
 */
function tidyEvidence(line: string): string {
  if (!line.includes("|")) return line;
  return line.replace(/"([^"]*\|[^"]*)"/g, (_, quote: string) => {
    const cells = quote.split("|").map((c) => c.trim()).filter(Boolean);
    return `"${cells.join(" · ")}"`;
  });
}
import { Tickmark, tickLegend, type TickKind } from "@/components/tickmark";

gsap.registerPlugin(useGSAP);

type Filter = "all" | "exceptions" | "passing";

function tickFor(gate: Gate, result: GateResult): TickKind {
  // Only a passing or failing result earns a tick; a pending sign-off shows
  // its evidence without one.
  if (result.evidence.length === 0 || result.status === "unknown") return "none";
  if (gate.kind === "metric") return "computed";
  if (gate.kind === "document") return "quoted";
  return "signed";
}

function ruleText(gate: Gate): string {
  if (gate.kind === "metric") {
    const { signal, op, target, unit } = gate.metric;
    return `${signal} ${op} ${target}${unit ?? ""}`;
  }
  if (gate.kind === "signoff") return `Approval from ${gate.signoff.role}`;
  return gate.document.question;
}

export function GateTable({
  release,
  results,
  animationKey,
  highlight,
}: {
  release: Release;
  results: GateResult[];
  /** Changes when a new check lands; replays the tickmark strike. */
  animationKey: string;
  highlight: string | null;
}) {
  const [chosenFilter, setFilter] = useState<Filter>("all");
  // A memo citation shows every gate so the cited row is always visible.
  const filter: Filter = highlight ? "all" : chosenFilter;
  const [open, setOpen] = useState<Set<string>>(new Set());
  const container = useRef<HTMLDivElement>(null);
  const byId = new Map(results.map((r) => [r.gateId, r]));

  const exceptions = results.filter((r) => r.status !== "pass").length;
  const counts: Record<Filter, number> = {
    all: results.length,
    exceptions,
    passing: results.length - exceptions,
  };

  const rows = release.gates.filter((gate) => {
    const status = byId.get(gate.id)?.status ?? "unknown";
    if (filter === "exceptions") return status !== "pass";
    if (filter === "passing") return status === "pass";
    return true;
  });

  // Signature moment: blue-pencil tickmarks are struck down the evidence
  // column in order when a check lands. Content is visible without it.
  useGSAP(
    (_context, contextSafe) => {
      const mm = gsap.matchMedia();
      let timeline: gsap.core.Timeline | undefined;
      // Start only once a frame actually renders, so hidden views never
      // show the starting state.
      const play = contextSafe!(() => {
        mm.add("(prefers-reduced-motion: no-preference)", () => {
          const strokes = gsap.utils.toArray<SVGElement>(
            "[data-evidence] [data-tick]:not([data-tick='none']) > *",
          );
          timeline = gsap
            .timeline()
            .fromTo(
              strokes,
              { strokeDasharray: 1, strokeDashoffset: 1 },
              {
                strokeDashoffset: 0,
                duration: 0.45,
                ease: "expo.out",
                stagger: 0.07,
              },
              0.1,
            )
            .fromTo(
              "[data-status-cell]",
              { opacity: 0.25 },
              { opacity: 1, duration: 0.4, ease: "expo.out", stagger: 0.07 },
              0,
            );
        });
      });
      const frame = requestAnimationFrame(() => play());
      // Where frames are throttled (background or embedded views), finish
      // the timeline on a timer so the evidence is never left half drawn.
      const settle = window.setTimeout(() => timeline?.progress(1), 1500);
      return () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(settle);
        mm.revert();
      };
    },
    { scope: container, dependencies: [animationKey], revertOnUpdate: true },
  );

  // A memo citation scrolls its gate into view.
  useEffect(() => {
    if (!highlight) return;
    // Effects run after commit, so every row is laid out by now.
    const row = document.getElementById(`gate-${highlight}`);
    if (!row) return;
    const top = row.getBoundingClientRect().top + window.scrollY;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = Math.max(0, top - window.innerHeight / 3);
    const start = window.scrollY;
    window.scrollTo({ top: target, behavior: reduce ? "auto" : "smooth" });
    // Some embedded browsers ignore smooth scrolling; jump if nothing moved.
    const fallback = window.setTimeout(() => {
      if (window.scrollY === start) window.scrollTo({ top: target });
    }, 350);
    return () => window.clearTimeout(fallback);
  }, [highlight]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section aria-labelledby="gates-heading" ref={container}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="gates-heading" className="text-base font-semibold">
          Gates
        </h2>
        <div
          role="group"
          aria-label="Filter gates"
          className="inline-flex rounded-md border bg-sheet p-0.5 text-[13px]"
        >
          {(["all", "exceptions", "passing"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-[3px] px-2.5 py-1 font-medium text-muted-foreground transition-colors hover:text-foreground",
                filter === key && "bg-secondary text-foreground",
              )}
            >
              {key === "all" ? "All" : key === "exceptions" ? "Exceptions" : "Passing"}
              <span className="ml-1.5 font-mono text-xs tabular opacity-70">
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border bg-sheet shadow-[0_1px_2px_rgba(19,33,27,0.05)]">
        {/* Below md the rows restack as a list, so nothing scrolls sideways. */}
        <table className="w-full text-left text-sm max-md:block md:min-w-[700px]">
          <caption className="sr-only">
            Readiness gates with result, control, owner, finding and evidence
          </caption>
          <colgroup>
            <col className="w-[84px]" />
            <col className="w-[27%]" />
            <col className="w-[132px]" />
            <col />
            <col className="w-[27%]" />
          </colgroup>
          <thead className="max-md:hidden">
            <tr className="border-b text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-medium">Result</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Gate</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Control · Owner</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Finding</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Evidence</th>
            </tr>
          </thead>
          <tbody className="max-md:block">
            {rows.length === 0 && (
              <tr className="max-md:block">
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground max-md:block">
                  {filter === "exceptions"
                    ? "No exceptions. Every gate passes."
                    : "No gates pass yet."}
                </td>
              </tr>
            )}
            {rows.map((gate) => {
              const result = byId.get(gate.id)!;
              const tick = tickFor(gate, result);
              const isOpen = open.has(gate.id);
              return (
                <Fragment key={gate.id}>
                  <tr
                    id={`gate-${gate.id}`}
                    className={cn(
                      "border-b border-rule align-top transition-colors duration-700 last:border-0 max-md:grid max-md:gap-2 max-md:px-4 max-md:py-3.5",
                      // The citation highlight wins over the failed-row tint.
                      highlight === gate.id
                        ? "bg-pencil-soft"
                        : result.status === "fail" && gate.blocking && "bg-nogo-soft/40",
                    )}
                  >
                    <td className="px-4 py-3 max-md:p-0" data-status-cell>
                      <GateStatusMark status={result.status} />
                    </td>
                    <td className="px-3 py-3 max-md:p-0">
                      <button
                        type="button"
                        onClick={() => toggle(gate.id)}
                        aria-expanded={isOpen}
                        className="group flex w-full items-start gap-1.5 text-left font-medium"
                      >
                        <span className="mt-px font-mono text-[11px] leading-5 font-medium text-pencil">
                          G{release.gates.indexOf(gate) + 1}
                        </span>
                        <span>{gate.title}</span>
                        <ChevronDown
                          className={cn(
                            "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
                            isOpen && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </button>
                    </td>
                    {/* Fixed furniture: the same columns for every gate of every release. */}
                    <td className="px-3 py-3 text-[13px] leading-5 max-md:flex max-md:flex-wrap max-md:gap-x-2 max-md:p-0 max-md:text-xs">
                      <span className="block">
                        <span className={gate.blocking ? "font-medium" : "text-muted-foreground"}>
                          {gate.blocking ? "Blocking" : "Advisory"}
                        </span>
                        <span className="text-muted-foreground"> · {gateKindLabel[gate.kind]}</span>
                        {gate.kind === "document" && <span className="ml-1 inline-block rounded-sm bg-pencil-soft px-1 text-[11px] font-medium whitespace-nowrap text-pencil" title="Judged by AI from the document, with a quote">AI-read</span>}
                      </span>
                      <span className="block text-muted-foreground">
                        <span className="md:hidden" aria-hidden>· </span>
                        {gate.owner}
                      </span>
                    </td>
                    <td className="px-3 py-3 leading-6 max-md:p-0">{result.reason}</td>
                    <td className="px-4 py-3 max-md:p-0" data-evidence>
                      <div className="flex items-start gap-2">
                        <Tickmark
                          kind={tick}
                          className="mt-1"
                          title={tickLegend.find((t) => t.kind === tick)?.label}
                        />
                        {result.evidence.length > 0 ? (
                          <div
                            className={cn(
                              "min-w-0 space-y-1 leading-5 [overflow-wrap:anywhere] text-foreground/90",
                              tick === "quoted" ? "text-[13px]" : "font-mono text-[12.5px]",
                            )}
                          >
                            {result.evidence.map((line) => (
                              <p key={line}>{tidyEvidence(line)}</p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[13px] leading-6 text-muted-foreground">
                            None yet
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-rule bg-muted/50 last:border-0 max-md:block">
                      <td className="max-md:hidden" />
                      <td colSpan={4} className="px-3 py-3 text-[13px] leading-6 max-md:block max-md:px-4">
                        <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
                          <dt className="text-muted-foreground">
                            {gate.kind === "document" ? "Question asked" : "Rule"}
                          </dt>
                          <dd className={cn(gate.kind === "metric" && "font-mono text-[12.5px]")}>
                            {ruleText(gate)}
                          </dd>
                          {gate.kind === "document" && (
                            <>
                              <dt className="text-muted-foreground">Source</dt>
                              <dd>
                                {release.signals.documents[gate.document.document]?.title ??
                                  "Not provided"}
                              </dd>
                            </>
                          )}
                          <dt className="text-muted-foreground">Category</dt>
                          <dd className="capitalize">{gate.category}</dd>
                        </dl>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Tickmarks</span>
        {tickLegend.map((t) => (
          <span key={t.kind} className="inline-flex items-center gap-1.5" title={t.detail}>
            <Tickmark kind={t.kind} className="size-3.5" />
            {t.label}
          </span>
        ))}
      </div>
    </section>
  );
}
