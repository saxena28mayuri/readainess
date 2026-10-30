"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { recommendationLabel } from "@/lib/format";
import { evaluateRelease } from "@/lib/readiness/evaluate";
import { demoReviews } from "@/lib/readiness/demo";
import { apiGatewayCutover } from "@/lib/readiness/samples";
import type { Gate, Recommendation } from "@/lib/readiness/types";
import { GateStatusMark, RecommendationIcon, recTextTone } from "@/components/verdict";
import { Tickmark, type TickKind } from "@/components/tickmark";

// The hero: the real release page for a sample release, polling its gates.
// Results come from the product's rules engine and the sample's precomputed
// document verdicts, exactly as demo mode shows them in the app.

const review = demoReviews["api-gateway-cutover"];
const evaluation = evaluateRelease(apiGatewayCutover, review.verdicts);
const gates = apiGatewayCutover.gates;
const STEP_MS = 420;

const ruleTone: Record<Recommendation, string> = {
  go: "border-t-go",
  conditional: "border-t-cond",
  "no-go": "border-t-nogo",
};

const kindLabel: Record<Gate["kind"], string> = { metric: "Number", document: "Document", signoff: "Sign-off" };

function tickFor(kind: Gate["kind"], status: string): TickKind {
  if (status === "unknown") return "none";
  return kind === "metric" ? "computed" : kind === "document" ? "quoted" : "signed";
}

/** First sentence of the memo, citations removed, for the window's summary. */
const memoLead = review.memo.split("\n")[0].replace(/\s*\[[^\]]+\]/g, "");

export function HeroWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [polled, setPolled] = useState(0);
  const [run, setRun] = useState(0);
  const done = polled >= gates.length;

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setPolled(gates.length);
      return;
    }
    setPolled(0);
    let i = 0;
    const start = window.setTimeout(function tick() {
      i += 1;
      setPolled(i);
      if (i < gates.length) timer = window.setTimeout(tick, STEP_MS);
    }, 700);
    let timer = start;
    return () => window.clearTimeout(timer);
  }, [inView, reduce, run]);

  const failed = evaluation.results.filter((r) => r.status === "fail");
  const passed = evaluation.results.filter((r) => r.status === "pass").length;
  const rec = evaluation.recommendation;

  return (
    <div ref={ref} data-ui className="overflow-hidden rounded-xl border border-[#dcdcd6] bg-white text-foreground">
      {/* window bar: breadcrumb, the release, the one action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ecece7] bg-[#fafaf8] px-5 py-3">
        <div className="min-w-0">
          <p className="text-[12px] text-muted-foreground">Releases / Cutover</p>
          <p className="truncate text-[15px] font-semibold">{apiGatewayCutover.name}</p>
        </div>
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-transform active:scale-[.97]"
        >
          {done ? <RotateCcw className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
          {done ? "Run the check again" : "Checking…"}
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {/* the call */}
          <div className={cn("border-t-[3px] px-5 py-4 transition-colors duration-300", done ? ruleTone[rec] : "border-t-[#d9d9d3]")}>
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.div
                  key="verdict"
                  initial={reduce ? false : { opacity: 0, y: 6, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-wrap items-end justify-between gap-4"
                >
                  <div>
                    <p className={cn("flex items-center gap-2 text-[28px] leading-none font-semibold tracking-tight", recTextTone[rec])}>
                      <RecommendationIcon value={rec} className="size-6" />
                      {recommendationLabel[rec]}
                    </p>
                    <p className="mt-2 text-[13px] text-muted-foreground">
                      {failed.length} blocking gate{failed.length === 1 ? "" : "s"} failed · {passed} of {gates.length} passing
                    </p>
                  </div>
                  <p className="max-w-[38ch] text-[13px] leading-5 text-muted-foreground">{memoLead}</p>
                </motion.div>
              ) : (
                <motion.p key="polling" exit={{ opacity: 0 }} className="text-[15px] text-muted-foreground">
                  Polling gate {Math.min(polled + 1, gates.length)} of {gates.length}…
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* the poll */}
          <table className="w-full border-t border-[#ecece7] text-left text-[13px]">
            <thead className="text-[12px] text-muted-foreground">
              <tr>
                <th className="py-2 pr-2 pl-5 font-normal">Gate</th>
                <th className="hidden px-2 py-2 font-normal md:table-cell">Owner</th>
                <th className="hidden px-2 py-2 font-normal sm:table-cell">Finding</th>
                <th className="py-2 pr-5 pl-2 text-right font-normal">Result</th>
              </tr>
            </thead>
            <tbody>
              {gates.map((g, i) => {
                const r = evaluation.results.find((x) => x.gateId === g.id)!;
                const shown = i < polled;
                const current = i === polled && !done;
                return (
                  <tr key={g.id} className={cn("border-t border-[#f0f0ec] transition-colors duration-300", current && "bg-pencil-soft/60", shown && r.status === "fail" && "bg-nogo-soft/50")}>
                    <td className="py-2.5 pr-2 pl-5">
                      <span className="mr-2 text-[12px] font-semibold text-pencil">G{i + 1}</span>
                      <span className="font-medium">{g.title}</span>
                      <span className="ml-2 hidden text-[12px] text-muted-foreground xl:inline">{kindLabel[g.kind]}{g.blocking ? "" : " · advisory"}</span>
                    </td>
                    <td className="hidden px-2 py-2.5 whitespace-nowrap text-muted-foreground md:table-cell">{g.owner}</td>
                    <td className="hidden max-w-[260px] px-2 py-2.5 sm:table-cell">
                      <span className={cn("block truncate transition-opacity duration-300", shown ? "opacity-100" : "opacity-0")} title={r.reason}>
                        {r.reason}
                      </span>
                    </td>
                    <td className="py-2.5 pr-5 pl-2">
                      <span className="flex items-center justify-end gap-2">
                        {shown ? (
                          <motion.span initial={reduce ? false : { opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="flex items-center gap-2">
                            <GateStatusMark status={r.status} />
                            <Tickmark kind={tickFor(g.kind, r.status)} />
                          </motion.span>
                        ) : (
                          <span className="text-[12px] text-muted-foreground">{current ? "Checking" : "Waiting"}</span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* the evidence for the cited failure */}
        <aside className="hidden border-l border-[#ecece7] bg-[#fafaf8] px-5 py-4 lg:block">
          <p className="text-[12px] text-muted-foreground">Evidence · G4 rollback plan</p>
          <p className="mt-2 text-[13px] leading-5">
            AI review of <span className="font-medium">Gateway rollback plan v3</span>
          </p>
          <p className="mt-3 rounded-md bg-pencil-soft px-3 py-2 text-[13px] leading-5 text-pencil">
            “{review.verdicts[0].quote}”
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-go">
            <Tickmark kind="quoted" className="size-4" /> Quote found in the document
          </p>
          <p className="mt-5 text-[12px] text-muted-foreground">Decision</p>
          <p className="mt-1 text-[13px] leading-5">
            {done ? (
              <>Waiting for the release manager. Overriding No-Go needs a written reason.</>
            ) : (
              <>Available when the poll finishes.</>
            )}
          </p>
        </aside>
      </div>
    </div>
  );
}
