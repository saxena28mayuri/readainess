"use client";

// Real interface fragments for the home page ([data-ui]): built from the
// product's own components and its demo data, at true size.
import { ArrowLeft, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { recommendationLabel } from "@/lib/format";
import { demoFiles, demoRelease, demoState } from "@/lib/landing/demo";
import type { Provenance } from "@/lib/import/structure";
import type { Recommendation } from "@/lib/readiness/types";
import { GateStatusMark, RecommendationIcon, recTextTone } from "@/components/verdict";
import { Tickmark, type TickKind } from "@/components/tickmark";

const ruleTone: Record<Recommendation, string> = {
  go: "border-t-go",
  conditional: "border-t-cond",
  "no-go": "border-t-nogo",
};

function tickFor(kind: string, status: string): TickKind {
  if (status === "unknown") return "none";
  return kind === "metric" ? "computed" : kind === "document" ? "quoted" : "signed";
}

export function sourceLine(source: Provenance): React.ReactNode {
  switch (source.kind) {
    case "count":
      return <>Counted {source.rows.length} row{source.rows.length === 1 ? "" : "s"} where <span className="text-pencil">{source.rule}</span></>;
    case "cell":
      return <>Row {source.row}, column <span className="text-pencil">“{source.column}”</span>: “{source.raw}”</>;
    case "quote":
      return <>“{source.quote}”</>;
    case "file":
      return <>Attached as evidence, unchanged</>;
  }
}

/** The release's checklist, written as the sentences the editor shows. */
export function ChecklistFragment() {
  return (
    <div data-ui className="w-[min(480px,100%)] rounded-lg border bg-sheet text-foreground">
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
        <p className="text-sm font-semibold">Readiness checklist</p>
        <p className="text-xs text-muted-foreground">{demoRelease.name}</p>
      </div>
      <ol className="divide-y divide-rule">
        {demoRelease.gates.map((g, i) => (
          <li key={g.id} className="grid grid-cols-[28px_1fr] gap-x-2 px-4 py-3 text-[13px] leading-5">
            <span className="text-[12px] font-semibold leading-5 text-pencil">G{i + 1}</span>
            <span>
              <span className="font-medium">{g.title}</span>
              <span className="block text-muted-foreground">
                {g.kind === "metric" && <>Passes when <code className="font-mono text-[12px] text-foreground">{g.metric.signal}</code> is {g.metric.op === "<=" ? "at most" : g.metric.op === ">=" ? "at least" : "exactly"} {g.metric.target}{g.metric.unit ?? ""}</>}
                {g.kind === "document" && <>AI reads the {g.document.document} plan and must quote it</>}
                {g.kind === "signoff" && <>Passes when {g.signoff.role} approves</>}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">4 gates · all blocking · agreed 12 Nov</p>
    </div>
  );
}

/** One export being mapped: what was read and where from. */
export function ImportFragment() {
  const s = demoState(["jira"]);
  const file = s.files[0];
  return (
    <div data-ui className="w-[min(480px,100%)] rounded-lg border bg-sheet text-foreground">
      <div className="flex items-center gap-2.5 border-b px-4 py-3">
        <FileSpreadsheet className="size-4 text-pencil" aria-hidden />
        <p className="text-[13px] font-medium">{file.fileName}</p>
        <p className="ml-auto text-xs text-muted-foreground">{file.description}</p>
      </div>
      <div className="space-y-2 px-4 py-3 text-[13px] leading-5">
        {file.items.map((item) => (
          <p key={item.key}>
            <code className="font-mono text-[12px]">{item.key}</code> = <span className="font-semibold">{String(item.value)}</span>
            <span className="block text-muted-foreground">
              <ArrowLeft className="mr-1 inline size-3 align-[-1px]" aria-label="from" />
              {sourceLine(item.source)}
            </span>
          </p>
        ))}
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          GW-415 and GW-398 are Done, GW-420 is S4 and GW-421 is a Story, so none of them count.
        </p>
      </div>
      <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs">
        <span className="text-muted-foreground">Changes to apply</span>
        <span className="font-medium">Metric openSev1Sev2: — → 1</span>
      </div>
    </div>
  );
}

/** The poll: every gate answers, then the call, then who decided. */
export function PollFragment({ added = ["jira", "signoffs", "rollback"] }: { added?: string[] }) {
  const s = demoState(added);
  const rec = s.evaluation.recommendation;
  return (
    <div data-ui className="w-[min(500px,100%)] rounded-lg border bg-sheet text-foreground">
      <ol className="divide-y divide-rule">
        {s.release.gates.map((g, i) => {
          const r = s.evaluation.results.find((x) => x.gateId === g.id)!;
          return (
            <li key={g.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-2 px-4 py-2.5">
              <span className="text-[12px] font-semibold leading-5 text-pencil">G{i + 1}</span>
              <span className="truncate text-[13px] font-medium">{g.title}</span>
              <span className="flex items-center gap-2">
                <GateStatusMark status={r.status} />
                <Tickmark kind={tickFor(g.kind, r.status)} />
              </span>
            </li>
          );
        })}
      </ol>
      <div className={cn("border-t border-t-[3px] px-4 py-3", ruleTone[rec])}>
        <p className="text-xs text-muted-foreground">Recommendation</p>
        <p className={cn("mt-0.5 flex items-center gap-2 text-2xl font-semibold tracking-tight", recTextTone[rec])}>
          <RecommendationIcon value={rec} className="size-5" />
          {recommendationLabel[rec]}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Blocked by G1: one open S1 bug (GW-412).</p>
      </div>
      <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
        Decided by <span className="font-medium text-foreground">S. Lee</span> · No-Go · 13 Nov, 16:40
      </div>
    </div>
  );
}

/** The live sheet: the exports the visitor picked, mapped and polled. */
export function LiveSheet({ added }: { added: string[] }) {
  const s = demoState(added);
  const rec = s.evaluation.recommendation;
  const last = s.files.at(-1);
  const lastVerdict = demoFiles.find((f) => f.id === added.at(-1))?.verdict;
  const open = s.evaluation.results.filter((r) => r.status === "unknown").length;
  return (
    <div data-ui className="h-sheet max-w-[calc(100%-32px)] rounded-lg border bg-sheet text-foreground">
      <div className="flex items-baseline justify-between gap-3 border-b px-5 py-3.5">
        <p className="text-[15px] font-semibold">{demoRelease.name}</p>
        <p className="text-xs text-muted-foreground">Readiness check · sample data</p>
      </div>
      <div className="min-h-[104px] border-b px-5 py-3 text-[13px] leading-5" aria-live="polite">
        {last ? (
          <div className="space-y-1">
            <p className="flex items-center gap-2 font-medium">
              {last.fileName.endsWith(".md") ? <FileText className="size-4 text-pencil" aria-hidden /> : <FileSpreadsheet className="size-4 text-pencil" aria-hidden />}
              {last.fileName} <span className="font-normal text-muted-foreground">· {last.description}</span>
            </p>
            {last.items.map((item) => (
              <p key={item.group + item.key} className="text-muted-foreground">
                <code className="font-mono text-[12px] text-foreground">{item.key}</code>
                <ArrowLeft className="mx-1 inline size-3 align-[-1px]" aria-label="from" />
                {sourceLine(item.source)}
              </p>
            ))}
            {lastVerdict?.quote && (
              <p className="text-muted-foreground">AI review quoted, and the quote was found: <span className="bg-pencil-soft text-pencil">“{lastVerdict.quote}”</span></p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No exports yet. Every gate is Unknown, and Unknown is never counted as a pass.</p>
        )}
      </div>
      <ol className="divide-y divide-rule">
        {s.release.gates.map((g, i) => {
          const r = s.evaluation.results.find((x) => x.gateId === g.id)!;
          return (
            <li key={g.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-x-3 px-5 py-3">
              <span className="pt-0.5 text-[12px] font-semibold leading-5 text-pencil">G{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium">{g.title}</span>
                <span className="block truncate text-[12px] text-muted-foreground">{r.status === "unknown" ? "No evidence yet." : r.reason}</span>
              </span>
              <span className="flex items-center gap-2 pt-0.5">
                <GateStatusMark status={r.status} />
                <Tickmark kind={tickFor(g.kind, r.status)} />
              </span>
            </li>
          );
        })}
      </ol>
      <div className={cn("border-t border-t-[3px] px-5 py-4", ruleTone[rec])}>
        <p className="text-xs text-muted-foreground">Recommendation</p>
        <p className={cn("mt-0.5 flex items-center gap-2 text-[1.75rem] leading-tight font-semibold tracking-tight", recTextTone[rec])}>
          <RecommendationIcon value={rec} className="size-6" />
          {recommendationLabel[rec]}
        </p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {s.evaluation.results.some((r) => r.status === "fail")
            ? "Blocked by G1: one open S1 bug."
            : open > 0
              ? `${open} gate${open === 1 ? "" : "s"} still without evidence.`
              : "Every gate has evidence."}
        </p>
      </div>
    </div>
  );
}

/* ---------- small proofs for the rules ---------- */

export function RuleMetric() {
  return (
    <div data-ui className="rounded-md border bg-sheet px-4 py-3 text-foreground">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium">G1 · No open Sev1/Sev2 bugs</p>
        <span className="flex items-center gap-2"><GateStatusMark status="fail" /><Tickmark kind="computed" /></span>
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground"><code className="font-mono">openSev1Sev2</code> = 1 · must be 0</p>
    </div>
  );
}

export function RuleQuote() {
  return (
    <div data-ui className="space-y-2 rounded-md border bg-sheet px-4 py-3 text-[13px] leading-5 text-foreground">
      <p className="text-muted-foreground">
        Time limit: rollback completes within 15 minutes.{" "}
        <span className="bg-pencil-soft text-pencil">Rehearsal: rehearsed in staging on 10 Nov; full rollback took 6 minutes.</span>
      </p>
      <p className="flex items-center gap-2 text-[12px] text-go"><Tickmark kind="quoted" className="size-4" /> Quote found in the document</p>
      <p className="text-[12px] text-muted-foreground"><s className="decoration-nogo decoration-2">“Rollback was tested in production.”</s> <span className="text-nogo">Not in the document, rejected</span></p>
    </div>
  );
}

export function RuleUnknown() {
  return (
    <div data-ui className="rounded-md border bg-sheet px-4 py-3 text-foreground">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium">G4 · Security sign-off</p>
        <span className="flex items-center gap-2"><GateStatusMark status="unknown" /><Tickmark kind="none" /></span>
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">No sign-off recorded. The call can be Conditional at best.</p>
    </div>
  );
}

export function RuleOverride() {
  return (
    <div data-ui className="rounded-md border bg-sheet px-4 py-3 text-[13px] leading-5 text-foreground">
      <p className="flex flex-wrap items-center gap-2">
        <s className="text-unknown">No-Go</s>
        <ArrowLeft className="size-3.5 rotate-180 text-muted-foreground" aria-label="changed to" />
        <span className="font-semibold text-go">Go</span>
        <span className="text-muted-foreground">by S. Lee, release manager</span>
      </p>
      <p className="mt-1 text-muted-foreground">“GW-412 is behind a flag that stays off for checkout; the partner launch is contractual.”</p>
      <p className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground"><Tickmark kind="signed" className="size-4" /> Logged with the evidence it overrode</p>
    </div>
  );
}

/** Settings: the stored key (never shown) and the AI activity log. */
export function KeyFragment() {
  const rows = [
    { when: "2 min ago", task: "Review", model: "gemini-flash-lite-latest", tokens: "3,184 / 412", time: "2.4s", ok: true },
    { when: "6 min ago", task: "Import", model: "gemini-flash-lite-latest", tokens: "1,906 / 238", time: "1.7s", ok: true },
    { when: "1 hr ago", task: "Key test", model: "gemini-flash-lite-latest", tokens: "—", time: "0.6s", ok: true },
  ];
  return (
    <div data-ui className="overflow-hidden rounded-lg border bg-sheet text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-[13px]">
        <span>Google Gemini key ending <span className="font-semibold">…q6iQ</span></span>
        <span className="rounded-md bg-go-soft px-2 py-0.5 text-[12px] font-medium text-go">Encrypted</span>
      </div>
      <table className="w-full text-left text-[12.5px]">
        <thead className="text-muted-foreground">
          <tr><th className="px-4 py-2 font-normal">AI activity</th><th className="px-2 py-2 font-normal">Task</th><th className="px-2 py-2 text-right font-normal">Tokens in / out</th><th className="px-4 py-2 text-right font-normal">Result</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.when} className="border-t border-rule">
              <td className="px-4 py-2 text-muted-foreground">{r.when}</td>
              <td className="px-2 py-2">{r.task}</td>
              <td className="px-2 py-2 text-right tabular-nums">{r.tokens}</td>
              <td className="px-4 py-2 text-right text-go">OK</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t px-4 py-2 text-[12px] text-muted-foreground">Metadata only: no files, prompts or answers are logged.</p>
    </div>
  );
}
