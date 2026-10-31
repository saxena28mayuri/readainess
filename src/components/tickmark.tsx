import { cn } from "@/lib/utils";

// Auditor's tickmarks, drawn as blue-pencil strokes. Each records how a
// figure was verified, the way working papers key marks to a legend.
// pathLength="1" on every stroke lets the check animation draw them.

export type TickKind = "computed" | "quoted" | "signed" | "none";

export const tickLegend: { kind: TickKind; label: string; detail: string }[] = [
  {
    kind: "computed",
    label: "Agreed to source data",
    detail: "Checked in code against the metric.",
  },
  {
    kind: "quoted",
    label: "Traced to document",
    detail: "AI judgement, backed by a verbatim quote.",
  },
  {
    kind: "signed",
    label: "Signed off",
    detail: "The named role recorded a decision.",
  },
  {
    kind: "none",
    label: "No evidence",
    detail: "Nothing to verify yet. Never counted as a pass.",
  },
];

// Hand-drawn: a short heavy down-stroke, then a long flick that lifts off,
// the way a pencil tick lands. Kept slightly irregular on purpose.
const strokes: Record<TickKind, React.ReactNode> = {
  computed: <path d="M2.6 10.8c1.3.9 2.5 2.2 3.6 4 2.6-4.6 6.2-8.6 11.3-12.1" pathLength={1} />,
  quoted: (
    <>
      <path d="M2.4 9.6c1.2.8 2.3 2 3.3 3.6 2.3-4 5.4-7.4 9.6-10.4" pathLength={1} />
      <path d="M16.9 14.9c0 1.6-1.1 2.8-2.5 2.8s-2.4-1.1-2.4-2.6c0-1.6 1.2-2.8 2.6-2.8 1.3 0 2.3 1.1 2.3 2.4" pathLength={1} />
    </>
  ),
  signed: (
    <>
      <path d="M2.6 8.6c1.2.8 2.3 2 3.3 3.6 2.3-4 5.4-7.4 9.6-10.4" pathLength={1} />
      <path d="M2.4 16.6c4.6-.6 9.6-.9 15.2-.4" pathLength={1} />
    </>
  ),
  none: <path d="M10 4.6c3.2 0 5.5 2.4 5.5 5.4s-2.4 5.5-5.6 5.5c-3.1 0-5.4-2.5-5.4-5.4 0-3.1 2.4-5.4 5.3-5.3" pathLength={1} strokeDasharray="0.1 0.07" />,
};

export function Tickmark({
  kind,
  className,
  title,
}: {
  kind: TickKind;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-tick={kind}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn(
        "size-[18px] shrink-0",
        kind === "none" ? "text-unknown" : "text-pencil",
        className,
      )}
    >
      {strokes[kind]}
    </svg>
  );
}
