import { OctagonX, TriangleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { recommendationLabel, statusLabel } from "@/lib/format";
import type { GateStatus, Recommendation } from "@/lib/readiness/types";

const recIcon: Record<Recommendation, typeof CircleCheck> = {
  go: CircleCheck,
  conditional: TriangleAlert,
  "no-go": OctagonX,
};

export const recTextTone: Record<Recommendation, string> = {
  go: "text-go",
  conditional: "text-cond",
  "no-go": "text-nogo",
};

/** Recommendation as a coloured word with its mark; struck when superseded. */
export function RecommendationTag({
  value,
  className,
  struck,
}: {
  value: Recommendation;
  className?: string;
  struck?: boolean;
}) {
  const Icon = recIcon[value];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[13px] font-semibold whitespace-nowrap",
        struck ? "text-unknown line-through decoration-1" : recTextTone[value],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {recommendationLabel[value]}
    </span>
  );
}

export function RecommendationIcon({
  value,
  className,
}: {
  value: Recommendation;
  className?: string;
}) {
  const Icon = recIcon[value];
  return <Icon className={className} aria-hidden />;
}

const statusTone: Record<GateStatus, string> = {
  pass: "text-go",
  fail: "text-nogo",
  unknown: "text-unknown",
};

export const statusDot: Record<GateStatus, string> = {
  pass: "bg-go",
  fail: "bg-nogo",
  unknown: "bg-[#b6c2bc]",
};

/**
 * Gate result, led by the word. The mark is a plain square so the only
 * checkmarks on the page are the auditor's blue-pencil tickmarks.
 */
export function GateStatusMark({
  status,
  className,
}: {
  status: GateStatus;
  className?: string;
}) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 text-[13px] font-semibold",
        statusTone[status],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-[1px]",
          status === "unknown" ? "border border-current" : statusDot[status],
        )}
      />
      {statusLabel[status]}
    </span>
  );
}
