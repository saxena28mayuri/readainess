import { cn } from "@/lib/utils";
import { recommendationLabel, timeAgo } from "@/lib/format";
import type { Evaluation, Release } from "@/lib/readiness/types";
import type { CheckView } from "@/lib/use-checks";
import { RecommendationIcon, recTextTone } from "@/components/verdict";

const recRule = {
  go: "border-t-go",
  conditional: "border-t-cond",
  "no-go": "border-t-nogo",
} as const;

/** One sentence that says why, in the auditor's register. */
function rationale(release: Release, evaluation: Evaluation): string {
  const gates = new Map(release.gates.map((g) => [g.id, g]));
  let failedBlocking = 0;
  let unknownBlocking = 0;
  let advisory = 0;
  for (const r of evaluation.results) {
    const gate = gates.get(r.gateId);
    if (!gate || r.status === "pass") continue;
    if (!gate.blocking) advisory += 1;
    else if (r.status === "fail") failedBlocking += 1;
    else unknownBlocking += 1;
  }
  const plural = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`;

  if (evaluation.recommendation === "go") {
    return "Every gate passes with evidence on file.";
  }
  if (evaluation.recommendation === "no-go") {
    const parts = [plural(failedBlocking, "blocking gate failed", "blocking gates failed")];
    if (unknownBlocking) parts.push(`${plural(unknownBlocking, "more is", "more are")} waiting on evidence`);
    return `${parts.join(" and ")}.`;
  }
  const parts: string[] = [];
  if (unknownBlocking)
    parts.push(`${plural(unknownBlocking, "blocking gate is", "blocking gates are")} waiting on evidence`);
  if (advisory)
    parts.push(`${plural(advisory, "advisory gate needs", "advisory gates need")} attention`);
  return `No blocking gate has failed, but ${parts.join(" and ")}.`;
}

export function Opinion({
  release,
  view,
}: {
  release: Release;
  view: CheckView;
}) {
  const { evaluation } = view;
  const rec = evaluation.recommendation;
  const passing = evaluation.results.filter((r) => r.status === "pass").length;
  const figures = [
    ["Gates passing", `${passing} of ${evaluation.results.length}`],
    ["Blocking exceptions", String(evaluation.blockers.length)],
    ["Advisory exceptions", String(evaluation.warnings.length)],
  ] as const;

  return (
    <section
      aria-label="Recommendation"
      className={cn("rounded-md border border-t-[3px] bg-sheet", recRule[rec])}
    >
      <div className="grid gap-x-8 gap-y-4 px-5 pt-4 pb-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p
            className={cn(
              "flex items-center gap-2.5 text-[30px] leading-none font-semibold tracking-tight",
              recTextTone[rec],
            )}
          >
            <RecommendationIcon value={rec} className="size-7" />
            {recommendationLabel[rec]}
          </p>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-6">
            {rationale(release, evaluation)}
          </p>
        </div>
        <dl className="min-w-56 text-sm">
          {figures.map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-6 border-b border-rule py-1.5 first:pt-0 last:border-0"
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono font-medium tabular">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="border-t border-rule px-5 py-2.5 text-xs leading-5 text-muted-foreground">
        {view.source === "unchecked" ? (
          <>Not checked yet. Import data, then run a readiness check.</>
        ) : view.source === "sample" ? (
          <>
            Sample check with a precomputed AI review. Run a readiness check to
            record your own.
          </>
        ) : (
          <>
            Checked {view.checkedAt ? timeAgo(view.checkedAt) : ""} ·{" "}
            {view.model === "demo" ? (
              "demo AI results"
            ) : (
              <>
                documents reviewed by <span className="font-mono">{view.model}</span>
              </>
            )}{" "}
            · opinion computed by the rules engine
          </>
        )}
      </p>
    </section>
  );
}
