"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { recommendationLabel, timeAgo } from "@/lib/format";
import type { Recommendation } from "@/lib/readiness/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecommendationTag, recTextTone } from "@/components/verdict";

const choices: Recommendation[] = ["go", "conditional", "no-go"];

export function DecisionPanel({
  releaseId,
  canDecide,
  evaluationId,
  recommendation,
  decisions,
  onRunCheck,
  running,
}: {
  releaseId: Id<"releases">;
  canDecide: boolean;
  evaluationId?: Id<"evaluations">;
  recommendation: Recommendation;
  decisions: Doc<"decisions">[] | undefined;
  onRunCheck?: () => void;
  running?: boolean;
}) {
  const record = useMutation(api.decisions.record);
  const [choice, setChoice] = useState<Recommendation | null>(null);
  const { user } = useUser();
  // Recorded from the signed-in profile, never typed, so the log can be trusted.
  const decidedBy =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || user?.username || "";
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = choice ?? recommendation;
  const overriding = selected !== recommendation;
  const canRecord = Boolean(evaluationId && canDecide);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!evaluationId || !canDecide) return;
    if (overriding && reason.trim().length < 10) {
      setError("Explain why you are overriding the recommendation (at least 10 characters).");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await record({
        releaseId,
        evaluationId,
        decision: selected,
        decidedBy,
        reason,
      });
      setReason("");
      setChoice(null);
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^.*Uncaught Error: /, "").split("\n")[0] : "Could not record the decision.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="decision-heading" className="rounded-lg border bg-sheet">
      <div className="border-b px-4 py-3">
        <h2 id="decision-heading" className="text-base font-semibold">
          Decision
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The tool recommends. A person decides, and overrides need a reason.
        </p>
      </div>

      {canRecord ? (
        <form onSubmit={submit} className="space-y-4 px-4 py-4" noValidate>
          <fieldset>
            <legend className="text-sm font-medium">Call</legend>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {choices.map((value) => (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer items-center justify-center rounded-md border px-2 py-2 text-[13px] font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pencil",
                    selected === value
                      ? cn("border-current bg-muted", recTextTone[value])
                      : "text-muted-foreground hover:border-input hover:text-foreground",
                  )}
                >
                  <input
                    type="radio"
                    name="decision"
                    value={value}
                    checked={selected === value}
                    onChange={() => setChoice(value)}
                    className="sr-only"
                  />
                  {recommendationLabel[value]}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {overriding ? (
                <>
                  Overriding the <span className="font-medium">{recommendationLabel[recommendation]}</span>{" "}
                  recommendation. This is logged.
                </>
              ) : (
                <>Matches the recommendation.</>
              )}
            </p>
          </fieldset>

          <p className="text-sm">
            <span className="text-muted-foreground">Decided by</span>{" "}
            <span className="font-medium">{decidedBy || "your account"}</span>
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="reason">
              Reason{" "}
              <span className="font-normal text-muted-foreground">
                {overriding ? "(required for an override)" : "(optional)"}
              </span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={
                overriding
                  ? "Why the evidence does not change your call"
                  : "Conditions, follow-ups or context"
              }
            />
          </div>

          {error && (
            <p role="alert" className="text-[13px] leading-5 text-nogo">
              {error}
            </p>
          )}

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Recording…" : "Record decision"}
          </Button>
        </form>
      ) : (
        <div className="space-y-3 px-4 py-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Decisions are filed against a recorded check. Run a readiness check
            first, then record the call here.
          </p>
          {onRunCheck && (
            <Button variant="outline" onClick={onRunCheck} disabled={running}>
              {running ? "Running check…" : "Run readiness check"}
            </Button>
          )}
        </div>
      )}

      {decisions && decisions.length > 0 && (
        <div className="border-t px-4 py-3">
          <h3 className="text-xs font-medium text-muted-foreground">Decision log</h3>
          <ol className="mt-2 space-y-3">
            {decisions.map((d, i) => {
              const superseded = i > 0;
              return (
                <li key={d._id} className={cn("text-[13px] leading-5", superseded && "text-muted-foreground")}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {d.overrode && d.recommended && (
                      <>
                        <RecommendationTag value={d.recommended} struck />
                        <span aria-hidden className="text-muted-foreground">→</span>
                      </>
                    )}
                    <RecommendationTag value={d.decision} struck={superseded} />
                    {d.overrode && (
                      <span className="text-xs font-medium text-cond">Override</span>
                    )}
                    {superseded && <span className="text-xs">Superseded</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">{d.decidedBy}</span> ·{" "}
                    {timeAgo(d._creationTime)}
                  </p>
                  {d.reason && <p className="mt-1">{d.reason}</p>}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
