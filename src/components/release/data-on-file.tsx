"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Loader2, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { timeAgo } from "@/lib/format";
import { errorText } from "@/lib/settings";
import { importTargets } from "@/lib/import/structure";
import type { Release, SignalMeta } from "@/lib/readiness/types";

type Group = "metric" | "signoff" | "document";

interface Row {
  group: Group;
  key: string;
  label: string;
  value: string;
  /** The gate that reads this value, or null when no gate does. */
  usedBy: string | null;
}

const groupWord: Record<Group, string> = { metric: "Metric", signoff: "Sign-off", document: "Document" };

function rowsOf(release: Release): Row[] {
  const targets = importTargets(release);
  const used = {
    metric: new Map(targets.metrics.map((t) => [t.key, t.title])),
    signoff: new Map(targets.signoffs.map((t) => [t.key, t.title])),
    document: new Map(targets.documents.map((t) => [t.key, t.title])),
  };
  const { metrics, signoffs, documents } = release.signals;
  return [
    ...Object.entries(metrics).map(([key, v]): Row => ({ group: "metric", key, label: key, value: String(v), usedBy: used.metric.get(key) ?? null })),
    ...Object.entries(signoffs).map(([key, s]): Row => ({ group: "signoff", key, label: key, value: s.status, usedBy: used.signoff.get(key) ?? null })),
    ...Object.entries(documents).map(([key, d]): Row => ({ group: "document", key, label: key, value: d.title, usedBy: used.document.get(key) ?? null })),
  ].sort((a, b) => Number(a.usedBy === null) - Number(b.usedBy === null));
}

/**
 * Everything imported so far, with when and from which file. Values no gate
 * reads any more (for example after a gate was renamed) are called out so they
 * can be removed rather than silently lingering.
 */
export function DataOnFile({
  release,
  releaseId,
  meta,
  canEdit,
}: {
  release: Release;
  releaseId: Id<"releases">;
  meta?: SignalMeta;
  canEdit: boolean;
}) {
  const removeSignal = useMutation(api.releases.removeSignal);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = rowsOf(release);
  const unused = rows.filter((r) => r.usedBy === null).length;

  async function remove(row: Row) {
    const id = `${row.group}:${row.key}`;
    setBusy(id);
    setError(null);
    try {
      await removeSignal({ releaseId, group: row.group, key: row.key });
    } catch (err) {
      setError(errorText(err, "Could not remove this value."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="onfile-heading" className="rounded-lg border bg-sheet">
      <div className="border-b px-4 py-3">
        <h2 id="onfile-heading" className="text-sm font-semibold">Data on file</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {rows.length === 0
            ? "Nothing imported yet."
            : `${rows.length} value${rows.length === 1 ? "" : "s"}. Importing again replaces a value with the same name.`}
          {unused > 0 && ` ${unused} not used by any gate.`}
        </p>
      </div>
      {rows.length > 0 && (
        <ul className="divide-y divide-rule">
          {rows.map((r) => {
            const id = `${r.group}:${r.key}`;
            const m = meta?.[id];
            return (
              <li key={id} className="flex items-start gap-2 px-4 py-2.5 text-[13px] leading-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {r.label} <span className="font-normal text-muted-foreground">· {r.value}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {groupWord[r.group]} ·{" "}
                    {m ? `${timeAgo(m.at)}${m.source ? ` from ${m.source}` : ""}` : "imported before dates were tracked"}
                  </p>
                  <p className={r.usedBy ? "text-xs text-muted-foreground" : "text-xs font-medium text-cond"}>
                    {r.usedBy ? `Used by: ${r.usedBy}` : "Not used by any gate"}
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => remove(r)}
                    disabled={busy === id}
                    aria-label={`Remove ${r.label}`}
                    className="mt-0.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-nogo focus-visible:outline-2 focus-visible:outline-pencil"
                  >
                    {busy === id ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && <p role="alert" className="border-t px-4 py-2 text-xs text-nogo">{error}</p>}
    </section>
  );
}
