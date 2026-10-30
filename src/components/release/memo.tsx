"use client";

import { Fragment } from "react";
import type { Release } from "@/lib/readiness/types";

const CITATION = /\[([a-z0-9-]+)\]/g;

/** Renders memo text with [gate-id] citations as links to the gate row. */
function withCitations(
  text: string,
  release: Release,
  onCite: (gateId: string) => void,
) {
  const titles = new Map(release.gates.map((g) => [g.id, g.title]));
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(CITATION)) {
    const id = match[1];
    const index = match.index ?? 0;
    parts.push(text.slice(last, index));
    if (titles.has(id)) {
      const n = release.gates.findIndex((g) => g.id === id) + 1;
      parts.push(
        <button
          key={`${id}-${index}`}
          type="button"
          onClick={() => onCite(id)}
          title={`Go to gate: ${titles.get(id)}`}
          className="mx-0.5 inline-flex h-[18px] items-center rounded-sm bg-pencil-soft px-1 align-[1px] font-mono text-[11px] font-medium text-pencil hover:bg-pencil hover:text-white"
        >
          G{n}
        </button>,
      );
    }
    // Anything else in brackets (e.g. a stray "[targetDate]") is dropped.
    last = index + match[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

export function Memo({
  release,
  memo,
  source,
  onCite,
}: {
  release: Release;
  memo?: string;
  source: "recorded" | "sample" | "unchecked";
  onCite: (gateId: string) => void;
}) {
  const paragraphs = (memo ?? "").split(/\n\s*\n/).filter(Boolean);
  return (
    <section aria-labelledby="memo-heading" className="rounded-lg border bg-sheet">
      <div className="border-b px-4 py-3">
        <h2 id="memo-heading" className="text-base font-semibold">
          Go/no-go memo
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {source === "sample" ? "Sample draft" : "AI draft"} · every claim
          cites its gate
        </p>
      </div>
      <div className="space-y-3 px-4 py-4 text-sm leading-6">
        {paragraphs.length === 0 ? (
          <p className="text-muted-foreground">
            No memo for this check. Run a readiness check with AI review to
            draft one.
          </p>
        ) : (
          paragraphs.map((p, i) => (
            <p key={i} className={i === 0 ? "font-medium" : undefined}>
              {withCitations(p, release, onCite).map((part, j) => (
                <Fragment key={j}>{part}</Fragment>
              ))}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
