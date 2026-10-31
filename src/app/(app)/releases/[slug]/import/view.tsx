"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardPaste,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Loader2,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import { api } from "../../../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { errorText, useAiKey } from "@/lib/settings";
import { useReleaseDetail } from "@/lib/use-checks";
import { signalsTemplate } from "@/lib/import/parse";
import { uploadKind } from "@/lib/ai/structure";
import {
  MAX_DOCUMENT,
  importTargets,
  itemsToPatch,
  setDocumentSlot,
  winningItems,
  type ExtractedItem,
  type Provenance,
  type StructuredFile,
} from "@/lib/import/structure";
import type { Release, Signals } from "@/lib/readiness/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Entry = {
  id: string;
  fileName: string;
  text: string;
  kind: "table" | "document";
  state: "reading" | "done" | "error";
  result?: StructuredFile;
  error?: string;
};

const SAMPLE_JIRA = [
  "Issue key,Summary,Issue Type,Status,Priority",
  "GW-412,Checkout returns 502 through new gateway under burst,Bug,In Progress,Highest",
  "GW-415,Rate-limit header missing on partner routes,Bug,To Do,High",
  "GW-398,Stale CORS config on legacy route,Bug,Done,High",
  "GW-420,Typo in deprecation banner,Bug,To Do,Low",
].join("\n");

const MAX_FILE = 2_000_000;

/* ---------- consent, remembered per browser ---------- */

const CONSENT = "readainess.importConsent";
const CONSENT_EVENT = "readainess:consent";

function readConsent() {
  try {
    return window.localStorage.getItem(CONSENT) === "1";
  } catch {
    return false;
  }
}

function subscribeConsent(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_EVENT, onChange);
}

function saveConsent(value: boolean) {
  try {
    if (value) window.localStorage.setItem(CONSENT, "1");
    else window.localStorage.removeItem(CONSENT);
  } catch {
    // Storage blocked: consent lasts for this page only.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/* ---------- helpers ---------- */

function download(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function describeSource(source: Provenance): string {
  switch (source.kind) {
    case "count":
      return `Counted ${source.rows.length} row${source.rows.length === 1 ? "" : "s"} where ${source.rule}`;
    case "cell":
      return `Row ${source.row}, column “${source.column}”: “${source.raw}”`;
    case "quote":
      return `“${source.quote}”`;
    case "file":
      return "Whole file, unchanged";
  }
}

function describeValue(item: ExtractedItem): string {
  if (item.group === "metric") return String(item.value);
  if (item.group === "signoff") return `${item.value.status}${item.value.by ? ` by ${item.value.by}` : ""}`;
  return `${item.value.title} (${item.value.content.length.toLocaleString()} chars)`;
}

function describeBefore(release: Release, item: ExtractedItem): string {
  const s: Signals = release.signals;
  if (item.group === "metric") return s.metrics[item.key] === undefined ? "—" : String(s.metrics[item.key]);
  if (item.group === "signoff") return s.signoffs[item.key]?.status ?? "—";
  return s.documents[item.key]?.title ?? "—";
}

const groupLabel = { metric: "Metric", signoff: "Sign-off", document: "Document" } as const;

/* ---------- page ---------- */

export default function ImportPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { release, signedIn } = useReleaseDetail(slug);
  const { hasKey, provider, providerName } = useAiKey();
  const structureFile = useAction(api.ai.structureFile);
  const consented = useSyncExternalStore(subscribeConsent, readConsent, () => false);
  const duplicate = useMutation(api.releases.duplicate);
  const applyImport = useMutation(api.releases.applyImport);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<"copy" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  const targets = useMemo(() => (release ? importTargets(release) : null), [release]);

  if (release === null) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Release not found</h1>
        <Link href="/releases" className="mt-4 inline-block text-sm font-medium text-pencil underline">Back to all releases</Link>
      </div>
    );
  }
  if (release === undefined || !targets) {
    return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8"><h1 className="text-2xl font-semibold tracking-tight text-muted-foreground">Loading import…</h1></div>;
  }

  const editable = release.canEdit;
  const ready = editable && hasKey && consented;
  const done = entries.flatMap((e) => (e.state === "done" && e.result ? [e.result] : []));
  const patch = itemsToPatch(done);
  const winners = [...winningItems(done).values()];
  const reading = entries.some((e) => e.state === "reading");

  function structure(entry: Entry) {
    if (!release) return;
    structureFile({ releaseId: release._id, fileName: entry.fileName, text: entry.text })
      .then((result) =>
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, state: "done", result } : e))),
      )
      .catch((err) =>
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, state: "error", error: errorText(err, "Could not read this file.") } : e)),
        ),
      );
  }

  function addEntries(files: { name: string; text: string }[]) {
    const next: Entry[] = [];
    for (const f of files) {
      const kind = uploadKind(f.name);
      if (!kind) continue;
      next.push({ id: crypto.randomUUID(), fileName: f.name, text: f.text, kind, state: "reading" });
    }
    setEntries((prev) => [...prev, ...next]);
    next.forEach(structure);
  }

  async function addFiles(list: FileList | null) {
    if (!list || !ready) return;
    setApplied(null);
    setError(null);
    const files: { name: string; text: string }[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE) {
        setError(`${file.name} is larger than 2 MB.`);
        continue;
      }
      if (!uploadKind(file.name)) {
        setError(`${file.name}: upload .csv or .tsv tables, or .txt or .md documents.`);
        continue;
      }
      files.push({ name: file.name, text: await file.text() });
    }
    addEntries(files);
  }

  function addPaste() {
    if (!pasteText.trim() || !ready) return;
    addEntries([{ name: `Pasted text ${entries.length + 1}.txt`, text: pasteText }]);
    setPasteText("");
    setApplied(null);
  }

  function moveDocument(entry: Entry, slot: string | null) {
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id && e.result ? { ...e, result: setDocumentSlot(e.result, e.text, slot) } : e)),
    );
  }

  async function makeCopy() {
    if (!release) return;
    setBusy("copy");
    setError(null);
    try {
      const newSlug = await duplicate({ slug: release.slug });
      router.push(`/releases/${newSlug}/import`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not copy the release.");
      setBusy(null);
    }
  }

  async function apply() {
    if (!release || winners.length === 0) return;
    setBusy("apply");
    setError(null);
    try {
      await applyImport({ releaseId: release._id, signals: patch, files: done.map((f) => f.fileName) });
      // Back to the release, where the next step is to run the check.
      router.push(`/releases/${release.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0].replace(/^.*Uncaught Error: /, "") : "Import failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 lg:py-8">
      <Link href={`/releases/${release.slug}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden /> {release.name}
      </Link>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Import readiness data</h1>
      <p className="mt-1.5 max-w-[70ch] text-sm leading-6 text-muted-foreground">
        Upload exports in whatever layout your tools produce. AI works out where each
        value is; the values themselves are read from your file and checked before you
        see them. Nothing is saved until you apply.
      </p>

      {!editable && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted px-5 py-4">
          <div className="max-w-xl">
            <p className="font-medium">This is a sample release, so it is read-only.</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Make a copy in your workspace to import data into it.
            </p>
          </div>
          <Button onClick={makeCopy} disabled={busy === "copy" || !signedIn}>
            {busy === "copy" ? <Loader2 className="animate-spin" aria-hidden /> : <Copy aria-hidden />}
            Make an editable copy
          </Button>
        </div>
      )}

      {editable && !hasKey && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted px-5 py-4">
          <div className="max-w-xl">
            <p className="font-medium">Import needs an AI key.</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Exports come in many layouts, so AI maps each file onto this release’s
              checklist. Add a free Google Gemini key or an OpenAI key in Settings; it is stored encrypted on our server.
            </p>
          </div>
          <Link href="/settings" className={buttonVariants()}>
            <KeyRound aria-hidden /> Add key in Settings
          </Link>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-nogo/30 bg-nogo-soft px-4 py-2.5 text-sm text-nogo">{error}</p>
      )}
      {applied && (
        <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-go/30 bg-go-soft px-4 py-2.5 text-sm text-go">
          <span>{applied} Run a readiness check to see the new result.</span>
          <Link href={`/releases/${release.slug}`} className="font-medium underline">Back to release</Link>
        </div>
      )}

      <div
        className={cn("mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]", !(editable && hasKey) && "pointer-events-none opacity-50")}
        aria-disabled={!(editable && hasKey)}
      >
        <div className="space-y-6">
          <section aria-labelledby="privacy-heading" className="rounded-lg bg-muted px-5 py-4">
            <div className="flex gap-3">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-cond" aria-hidden />
              <div className="text-sm leading-6">
                <h2 id="privacy-heading" className="font-medium text-foreground">Files are sent to {providerName}</h2>
                <p className="mt-0.5 text-foreground/80">
                  Each file you add goes through ReadAIness to {providerName}, using your key, so it
                  can be mapped onto the checklist. Remove customer personal data, secrets
                  and anything your company does not allow to leave its systems.
                  ReadAIness does not keep the file; it stores only the values you apply.{" "}
                  {provider === "gemini" &&
                    "On Gemini’s free tier, Google may use this content to improve its products and people may review it. "}
                  See the{" "}
                  <Link href="/privacy" className="font-medium underline">privacy policy</Link>.
                </p>
                <label className="mt-2 flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={consented}
                    onChange={(e) => saveConsent(e.target.checked)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  I understand, and the files I add are allowed to go to {providerName}
                </label>
              </div>
            </div>
          </section>

          <section aria-labelledby="upload-heading" className={cn("rounded-lg border bg-sheet", !consented && "opacity-60")}>
            <div className="border-b px-5 py-3">
              <h2 id="upload-heading" className="text-base font-semibold">Upload files</h2>
            </div>
            <div className="p-5">
              <label
                onDragOver={(e) => { e.preventDefault(); if (ready) setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); void addFiles(e.dataTransfer.files); }}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input px-6 py-8 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pencil",
                  ready ? "cursor-pointer hover:border-pencil" : "cursor-not-allowed",
                  dragging && "border-pencil bg-pencil-soft",
                )}
              >
                <Upload className="size-5 text-muted-foreground" aria-hidden />
                <span className="text-sm font-medium">
                  {ready ? "Drop files here or choose files" : "Tick the box above to upload"}
                </span>
                <span className="text-xs leading-5 text-muted-foreground">
                  CSV or TSV: Jira, Azure DevOps or Linear exports, test reports, sign-off sheets ·
                  TXT or MD: rollback plans, runbooks, approval emails. Up to 2 MB each.
                </span>
                <input
                  type="file"
                  multiple
                  accept=".csv,.tsv,.txt,.md,.markdown"
                  className="sr-only"
                  disabled={!ready}
                  onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }}
                />
              </label>

              {entries.length > 0 && (
                <ul className="mt-4 divide-y divide-rule rounded-md border">
                  {entries.map((entry) => (
                    <FileRow
                      key={entry.id}
                      entry={entry}
                      documents={targets.documents}
                      onMove={(slot) => moveDocument(entry, slot)}
                      onRemove={() => setEntries((prev) => prev.filter((x) => x.id !== entry.id))}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section aria-labelledby="paste-heading" className={cn("rounded-lg border bg-sheet", !consented && "opacity-60")}>
            <div className="border-b px-5 py-3">
              <h2 id="paste-heading" className="text-base font-semibold">Paste document text</h2>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                No file? Copy the text of a page from Confluence, Google Docs or Notion and
                paste it here. It is handled like an uploaded document.
              </p>
            </div>
            <div className="space-y-3 p-5">
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={6}
                placeholder="Paste a rollback plan, runbook or approval email"
                aria-label="Document text"
                maxLength={MAX_DOCUMENT}
                disabled={!ready}
              />
              <Button variant="outline" onClick={addPaste} disabled={!ready || !pasteText.trim()}>
                <ClipboardPaste aria-hidden /> Add to import
              </Button>
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <section aria-labelledby="preview-heading" className="rounded-lg border bg-sheet">
            <div className="border-b px-4 py-3">
              <h2 id="preview-heading" className="text-base font-semibold">Changes to apply</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Each value shows where in your file it came from.</p>
            </div>
            {winners.length === 0 ? (
              <p className="px-4 py-4 text-sm leading-6 text-muted-foreground">
                {reading ? "Reading your files…" : "Nothing yet. Add a file or paste a document."}
              </p>
            ) : (
              <ul className="divide-y divide-rule">
                {winners.map(({ item, fileName }) => (
                  <li key={item.group + item.key} className="px-4 py-2.5 text-[13px] leading-5">
                    <p>
                      <span className="text-muted-foreground">{groupLabel[item.group]}</span>{" "}
                      <span className="font-mono text-[12.5px]">{item.key}</span>
                    </p>
                    <p className="mt-0.5">
                      <span className="text-muted-foreground line-through decoration-1">{describeBefore(release, item)}</span>
                      <span className="text-muted-foreground" aria-hidden> → </span>
                      <span className="sr-only"> becomes </span>
                      <span className="font-medium">{describeValue(item)}</span>
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                      <span className="text-foreground/70">{fileName}</span> · {describeSource(item.source)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t px-4 py-3">
              <Button className="w-full" onClick={apply} disabled={!editable || winners.length === 0 || reading || busy === "apply"}>
                {busy === "apply" && <Loader2 className="animate-spin" aria-hidden />}
                Apply {winners.length > 0 ? `${winners.length} change${winners.length === 1 ? "" : "s"}` : "changes"}
              </Button>
            </div>
          </section>

          <section aria-labelledby="templates-heading" className="rounded-lg border bg-sheet px-4 py-3">
            <h2 id="templates-heading" className="text-sm font-semibold">Example files</h2>
            <div className="mt-2 flex flex-col items-start gap-1.5 text-sm">
              <button
                type="button"
                onClick={() => download(`${release.slug}-signals.csv`, signalsTemplate(release))}
                className={buttonVariants({ variant: "link", className: "h-auto px-0 text-pencil" })}
              >
                <Download aria-hidden /> Checklist values for this release
              </button>
              <button
                type="button"
                onClick={() => download("example-jira-export.csv", SAMPLE_JIRA)}
                className={buttonVariants({ variant: "link", className: "h-auto px-0 text-pencil" })}
              >
                <Download aria-hidden /> Example Jira export
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Any layout works. In Jira, filter the release’s bugs and choose Export → CSV.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function FileRow({
  entry,
  documents,
  onMove,
  onRemove,
}: {
  entry: Entry;
  documents: { key: string; title: string }[];
  onMove: (slot: string | null) => void;
  onRemove: () => void;
}) {
  const r = entry.result;
  const docItem = r?.items.find((i) => i.group === "document");
  const values = r?.items.filter((i) => i.group !== "document") ?? [];
  const Icon = entry.kind === "table" ? FileSpreadsheet : FileText;
  return (
    <li className="px-4 py-3 text-sm">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium break-all">{entry.fileName}</p>
          {entry.state === "reading" && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" aria-hidden /> Mapping onto the checklist…
            </p>
          )}
          {entry.state === "error" && <p className="mt-0.5 text-xs text-nogo">{entry.error}</p>}
          {r && (
            <>
              <p className="text-xs text-muted-foreground">{r.description}</p>
              {entry.kind === "document" && documents.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <label htmlFor={`slot-${entry.id}`} className="text-muted-foreground">Evidence for</label>
                  <select
                    id={`slot-${entry.id}`}
                    value={docItem?.key ?? ""}
                    onChange={(e) => onMove(e.target.value || null)}
                    className="h-7 rounded-md border border-input bg-sheet px-2"
                  >
                    <option value="">No check (values only)</option>
                    {documents.map((d) => <option key={d.key} value={d.key}>{d.title}</option>)}
                  </select>
                </div>
              )}
              {values.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs">
                  {values.map((item) => (
                    <li key={item.group + item.key} className="truncate">
                      <span className="font-mono text-pencil">{item.key}</span> = {describeValue(item)}
                    </li>
                  ))}
                </ul>
              )}
              {values.length === 0 && !docItem && (
                <p className="mt-1 text-xs text-muted-foreground">Nothing in this file matches the checklist.</p>
              )}
              {r.rejected.length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="flex cursor-pointer items-center gap-1 text-cond">
                    <AlertTriangle className="size-3" aria-hidden />
                    {r.rejected.length} suggestion{r.rejected.length === 1 ? "" : "s"} failed verification
                  </summary>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                    {r.rejected.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${entry.fileName}`}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </li>
  );
}
