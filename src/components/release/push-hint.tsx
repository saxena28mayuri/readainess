"use client";

import { importTargets } from "@/lib/import/structure";
import type { Release } from "@/lib/readiness/types";
import { pushEndpoint } from "@/components/settings/api-tokens";

/** The curl for this release, with the names its gates read. */
export function PushHint({ release }: { release: Release }) {
  const targets = importTargets(release);
  const example: Record<string, unknown> = {};
  if (targets.metrics[0]) example.metrics = { [targets.metrics[0].key]: 0 };
  if (targets.signoffs[0]) example.signoffs = { [targets.signoffs[0].key]: { status: "approved", by: "Name" } };
  if (!example.metrics && !example.signoffs && targets.documents[0]) {
    example.documents = { [targets.documents[0].key]: { title: "Title", content: "Text" } };
  }
  const names = [...targets.metrics.map((t) => t.key), ...targets.signoffs.map((t) => t.key), ...targets.documents.map((t) => t.key)];
  return (
    <details className="rounded-lg border bg-sheet px-4 py-3 text-sm">
      <summary className="cursor-pointer font-semibold">Send from your pipeline</summary>
      <pre className="mt-2 overflow-x-auto rounded bg-muted p-2.5 font-mono text-[11.5px] leading-5">{`curl -X POST "${pushEndpoint()}?release=${release.slug}" \\
  -H "Authorization: Bearer $READAINESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ ...example, source: "CI run" })}'`}</pre>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        This release accepts: {names.length ? names.join(", ") : "nothing yet; add gates first"}. Create a token in{" "}
        <a href="/settings" className="font-medium text-pencil underline">Settings</a>.
      </p>
    </details>
  );
}
