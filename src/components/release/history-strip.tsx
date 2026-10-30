import { cn } from "@/lib/utils";
import { recommendationLabel, statusLabel, timeAgo } from "@/lib/format";
import type { Release } from "@/lib/readiness/types";
import type { EvaluationDoc } from "@/lib/use-checks";
import { recTextTone, statusDot } from "@/components/verdict";

/**
 * Recorded checks side by side at one fixed scale: one column per check,
 * one cell per gate in gate order, so successive checks compare directly.
 */
export function HistoryStrip({
  release,
  history,
}: {
  release: Release;
  history: EvaluationDoc[];
}) {
  if (history.length === 0) return null;
  const checks = [...history].reverse();

  return (
    <section aria-labelledby="history-heading">
      <h2 id="history-heading" className="text-base font-semibold">
        Check history
      </h2>
      <div className="mt-3 flex items-end gap-3 overflow-x-auto rounded-lg border bg-sheet px-4 py-3">
        <ol className="flex items-end gap-3">
          {checks.map((check, i) => {
            const latest = i === checks.length - 1;
            const byId = new Map(check.results.map((r) => [r.gateId, r.status]));
            return (
              <li
                key={check._id}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md px-1.5 py-1",
                  latest && "bg-muted",
                )}
              >
                <div
                  className={cn("flex flex-col gap-[3px]", !latest && "opacity-45")}
                  role="img"
                  aria-label={`${recommendationLabel[check.recommendation]}, ${timeAgo(check._creationTime)}: ${release.gates
                    .map((g) => `${g.title} ${statusLabel[byId.get(g.id) ?? "unknown"]}`)
                    .join(", ")}`}
                >
                  {release.gates.map((gate) => (
                    <span
                      key={gate.id}
                      className={cn(
                        "block h-2 w-6 rounded-[1px]",
                        statusDot[byId.get(gate.id) ?? "unknown"],
                      )}
                    />
                  ))}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    latest
                      ? recTextTone[check.recommendation]
                      : "text-unknown line-through decoration-1",
                  )}
                >
                  {recommendationLabel[check.recommendation]}
                </span>
                {!latest && <span className="sr-only">(superseded)</span>}
                <span className="text-[11px] text-muted-foreground tabular">
                  {timeAgo(check._creationTime)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
