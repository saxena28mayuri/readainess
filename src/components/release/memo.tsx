"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseBrief, rulesBrief, type BriefItem } from "@/lib/readiness/brief";
import type { Evaluation, Release } from "@/lib/readiness/types";

/**
 * The decision brief: blockers and advisory items, each with its next step,
 * and the gates already passing. Written by AI when a check ran with a key,
 * otherwise built from the gate results. Gate references jump to the row.
 */
export function Memo({
  release,
  evaluation,
  memo,
  model,
  onCite,
}: {
  release: Release;
  evaluation: Evaluation;
  memo?: string;
  model?: string;
  onCite: (gateId: string) => void;
}) {
  const brief = parseBrief(memo) ?? rulesBrief(release, evaluation);
  const byId = new Map(release.gates.map((g, i) => [g.id, { gate: g, n: i + 1 }]));
  const ready = release.gates.filter((g) => evaluation.results.find((r) => r.gateId === g.id)?.status === "pass");
  const ai = brief.source === "ai";
  const read = brief.documentsRead ?? release.gates.filter((g) => g.kind === "document").length;

  function Item({ item, tone }: { item: BriefItem; tone: "nogo" | "cond" }) {
    const ref = byId.get(item.gateId);
    if (!ref) return null;
    return (
      <li className="py-3">
        <button
          type="button"
          onClick={() => onCite(item.gateId)}
          className="group flex w-full items-start gap-2 text-left"
          title="Show this gate in the table"
        >
          <span className={cn("mt-0.5 shrink-0 rounded-sm px-1 text-[11px] font-semibold", tone === "nogo" ? "bg-nogo-soft text-nogo" : "bg-cond-soft text-cond")}>
            G{ref.n}
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-medium group-hover:underline">{ref.gate.title}</span>
            <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">{item.issue}</span>
          </span>
        </button>
        <p className="mt-1.5 ml-8 flex items-start gap-1.5 text-[13px] leading-5">
          <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-pencil" aria-label="Next step" />
          <span>{item.action}</span>
        </p>
      </li>
    );
  }

  return (
    <section aria-labelledby="brief-heading" className="rounded-lg border bg-sheet">
      <div className="border-b px-4 py-3">
        <h2 id="brief-heading" className="text-base font-semibold">Decision brief</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {ai ? <>Drafted by AI{model && model !== "demo" ? <> · {model}</> : " · sample review"}</> : "Built from the gate results"}
        </p>
      </div>

      <div className="px-4 pt-3">
        <p className="text-[15px] leading-6 font-medium">{brief.summary}</p>
      </div>

      {brief.blockers.length > 0 && (
        <div className="px-4 pt-4">
          <h3 className="text-xs font-semibold text-nogo">Blocking · {brief.blockers.length}</h3>
          <ul className="divide-y divide-rule">
            {brief.blockers.map((i) => <Item key={i.gateId} item={i} tone="nogo" />)}
          </ul>
        </div>
      )}

      {brief.advisory.length > 0 && (
        <div className="px-4 pt-3">
          <h3 className="text-xs font-semibold text-cond">Advisory · {brief.advisory.length}</h3>
          <ul className="divide-y divide-rule">
            {brief.advisory.map((i) => <Item key={i.gateId} item={i} tone="cond" />)}
          </ul>
        </div>
      )}

      <div className="px-4 pt-3 pb-4">
        <h3 className="text-xs font-semibold text-go">Ready · {ready.length} of {release.gates.length}</h3>
        {ready.length === 0 ? (
          <p className="mt-1.5 text-[13px] text-muted-foreground">No gate has passing evidence yet.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {ready.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => onCite(g.id)} className="rounded-md bg-go-soft px-2 py-1 text-[12px] font-medium text-go hover:underline">
                  G{byId.get(g.id)!.n} {g.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="flex items-start gap-2 border-t bg-muted/60 px-4 py-3 text-[12px] leading-5 text-muted-foreground">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-pencil" aria-hidden />
        {ai ? (
          <span>
            <b className="font-semibold text-foreground">AI</b> {read > 0 ? `read ${read} document${read === 1 ? "" : "s"} and wrote` : "wrote"} the next
            steps · <b className="font-semibold text-foreground">Rules</b> decided the recommendation
          </span>
        ) : (
          <span>
            <b className="font-semibold text-foreground">Rules</b> decided the recommendation and the next steps · add an AI key to have
            documents read
          </span>
        )}
      </p>
    </section>
  );
}
