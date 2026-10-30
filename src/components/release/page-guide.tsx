"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, CircleHelp } from "lucide-react";
import { Tickmark } from "@/components/tickmark";

const KEY = "readainess.guideCollapsed";
const EVENT = "readainess:guide";

/** Collapsed unless the person opened it, so the verdict leads the page. */
function read() {
  try {
    return window.localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

function setCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    // Storage blocked: the panel just resets on reload.
  }
  window.dispatchEvent(new Event(EVENT));
}

const terms: { term: string; body: React.ReactNode }[] = [
  {
    term: "Gates",
    body: "The checklist this release must meet, agreed before the meeting. Each gate is a number check, a document check or a sign-off.",
  },
  {
    term: "Result",
    body: "Pass, Fail or Unknown. Unknown means there is no evidence yet, and it never counts as a pass.",
  },
  {
    term: "Control · Owner",
    body: "Whether the gate is blocking or advisory, what kind of check it is, and who answers for it.",
  },
  {
    term: "Finding",
    body: "What was found, in one sentence: the measured number against its target, the document's answer, or who signed off.",
  },
  {
    term: "Recommendation",
    body: "Worked out by fixed rules, not by AI. Any failed blocking gate gives No-Go. Any blocking gate still Unknown, or any advisory problem, gives Conditional. Otherwise Go.",
  },
  {
    term: "Memo and decision",
    body: "The memo is an AI summary in which every claim links to its gate (G1, G2…). A person then records the call; going against the recommendation needs a written reason.",
  },
];

const ticks = [
  { kind: "computed" as const, label: "Checked in code against your data" },
  { kind: "quoted" as const, label: "Backed by a quote found in the document" },
  { kind: "signed" as const, label: "Approved by the named role" },
  { kind: "none" as const, label: "No evidence yet" },
];

export function PageGuide({ checklistHref }: { checklistHref: string }) {
  const collapsed = useSyncExternalStore(subscribe, read, () => true);
  const reduce = useReducedMotion();

  return (
    <section aria-labelledby="guide-heading" className="mt-6 rounded-lg border bg-sheet">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <CircleHelp className="size-4 text-pencil" aria-hidden />
          <span id="guide-heading" className="text-sm font-semibold">How to read this page</span>
        </span>
        <motion.span animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: reduce ? 0 : 0.2 }}>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="guide"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-6 border-t px-4 py-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {terms.map((t) => (
                  <div key={t.term}>
                    <dt className="text-[13px] font-semibold">{t.term}</dt>
                    <dd className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{t.body}</dd>
                  </div>
                ))}
              </dl>
              <div className="space-y-3">
                <p className="text-[13px] font-semibold">Evidence marks</p>
                <ul className="space-y-2">
                  {ticks.map((t) => (
                    <li key={t.kind} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      <Tickmark kind={t.kind} /> {t.label}
                    </li>
                  ))}
                </ul>
                <p className="text-[13px] leading-5 text-muted-foreground">
                  The gates come from the checklist template for this kind of release. Change them in{" "}
                  <Link href={checklistHref} className="font-medium text-pencil underline underline-offset-2">the checklist</Link>.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
