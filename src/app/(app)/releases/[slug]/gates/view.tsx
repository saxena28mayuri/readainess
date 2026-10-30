"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowLeft, ArrowUp, FileText, Gauge, Loader2, PenLine, Plus, Trash2 } from "lucide-react";
import { api } from "../../../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { errorText } from "@/lib/settings";
import { useReleaseDetail } from "@/lib/use-checks";
import type { ComparisonOp, Gate, GateCategory } from "@/lib/readiness/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Kind = Gate["kind"];

const kinds: { value: Kind; label: string; hint: string; icon: typeof Gauge }[] = [
  { value: "metric", label: "Number check", hint: "A figure from your data, checked in code", icon: Gauge },
  { value: "document", label: "Document check", hint: "AI reads a document and must quote it", icon: FileText },
  { value: "signoff", label: "Sign-off", hint: "A named role approves", icon: PenLine },
];

const categories: GateCategory[] = ["quality", "performance", "resilience", "operations", "security", "signoff"];
const ops: { value: ComparisonOp; label: string }[] = [
  { value: "<=", label: "at most" },
  { value: ">=", label: "at least" },
  { value: "==", label: "exactly" },
];

function newId(title: string) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36) || "gate";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

function blankGate(kind: Kind): Gate {
  const base = { id: newId(kind), title: "", owner: "", blocking: true };
  if (kind === "metric") return { ...base, kind, category: "quality", metric: { signal: "", op: "<=", target: 0 } };
  if (kind === "document") return { ...base, kind, category: "operations", document: { document: "", question: "" } };
  return { ...base, kind, category: "signoff", signoff: { role: "" } };
}

/** Switches a gate's kind, keeping its title, owner and blocking flag. */
function withKind(gate: Gate, kind: Kind): Gate {
  if (gate.kind === kind) return gate;
  const fresh = blankGate(kind);
  return { ...fresh, id: gate.id, title: gate.title, owner: gate.owner, blocking: gate.blocking } as Gate;
}

export default function GatesEditor() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { release } = useReleaseDetail(slug);
  const updateGates = useMutation(api.releases.updateGates);
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState<Gate[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (release === null) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Release not found</h1>
        <Link href="/releases" className="mt-4 inline-block text-sm font-medium text-pencil underline">Back to all releases</Link>
      </div>
    );
  }
  if (release === undefined) return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8"><h1 className="text-2xl font-semibold tracking-tight text-muted-foreground">Loading checklist…</h1></div>;

  const gates = draft ?? release.gates;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(release.gates);
  const editable = release.canEdit;

  function update(index: number, next: Gate) {
    setDraft(gates.map((g, i) => (i === index ? next : g)));
  }
  function move(index: number, by: -1 | 1) {
    const next = [...gates];
    const [g] = next.splice(index, 1);
    next.splice(index + by, 0, g);
    setDraft(next);
  }

  async function save() {
    if (!release) return;
    setSaving(true);
    setError(null);
    try {
      await updateGates({ releaseId: release._id, gates });
      setDraft(null);
      router.push(`/releases/${release.slug}`);
    } catch (err) {
      setError(errorText(err, "Could not save the checklist."));
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-28 sm:px-8 lg:py-8">
      <Link href={`/releases/${release.slug}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden /> {release.name}
      </Link>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Readiness checklist</h1>
      <p className="mt-1.5 max-w-[70ch] text-sm leading-6 text-muted-foreground">
        Gates are the conditions this release must meet. Agree them with your team before the
        go/no-go, then import evidence for each one. A <strong className="font-medium text-foreground">blocking</strong> gate
        that fails makes the call No-Go; an <strong className="font-medium text-foreground">advisory</strong> gate can only make it Conditional.
      </p>

      {!editable && (
        <p className="mt-6 rounded-lg bg-muted px-5 py-4 text-sm">
          This is a sample release, so its checklist is read-only. Make a copy from the import page to edit it.
        </p>
      )}

      <ol className="mt-8 space-y-3">
        <AnimatePresence initial={false}>
          {gates.map((gate, i) => (
            <motion.li
              key={gate.id}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -12, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
            >
              <GateCard
                gate={gate}
                index={i}
                count={gates.length}
                disabled={!editable}
                onChange={(g) => update(i, g)}
                onMove={(by) => move(i, by)}
                onRemove={() => setDraft(gates.filter((_, j) => j !== i))}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>

      {editable && (
        <div className="mt-4 rounded-lg border border-dashed border-input p-4">
          <p className="text-sm font-medium">Add a gate</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {kinds.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setDraft([...gates, blankGate(k.value)])}
                disabled={gates.length >= 25}
                className="flex items-start gap-2.5 rounded-md border bg-sheet px-3 py-2.5 text-left text-sm transition-colors hover:border-pencil disabled:opacity-50"
              >
                <k.icon className="mt-0.5 size-4 shrink-0 text-pencil" aria-hidden />
                <span>
                  <span className="flex items-center gap-1 font-medium"><Plus className="size-3.5" aria-hidden />{k.label}</span>
                  <span className="block text-xs text-muted-foreground">{k.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {editable && dirty && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-[min(640px,calc(100%-2rem))] flex-wrap items-center justify-between gap-3 rounded-lg border bg-rail px-4 py-3 text-rail-foreground shadow-[0_18px_40px_-18px_rgba(18,61,51,0.7)] lg:left-64"
            role="region"
            aria-label="Unsaved changes"
          >
            <span className="text-sm">{error ? <span className="text-[#ffb4a6]">{error}</span> : "You have unsaved changes to the checklist."}</span>
            <span className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-rail-foreground hover:bg-rail-raised hover:text-rail-foreground" onClick={() => { setDraft(null); setError(null); }}>
                Discard
              </Button>
              <Button size="sm" className="bg-rail-foreground text-rail hover:bg-white" onClick={save} disabled={saving}>
                {saving && <Loader2 className="animate-spin" aria-hidden />} Save checklist
              </Button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GateCard({
  gate,
  index,
  count,
  disabled,
  onChange,
  onMove,
  onRemove,
}: {
  gate: Gate;
  index: number;
  count: number;
  disabled: boolean;
  onChange: (g: Gate) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const field = "h-8 rounded-md border border-input bg-sheet px-2 text-[13px] disabled:opacity-70";
  return (
    <fieldset disabled={disabled} className="rounded-lg border bg-sheet">
      <legend className="sr-only">Gate {index + 1}</legend>
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <span className="font-mono text-[11px] text-pencil">G{index + 1}</span>
        <Input
          value={gate.title}
          onChange={(e) => onChange({ ...gate, title: e.target.value })}
          placeholder="What must be true, e.g. No open Sev1/Sev2 bugs"
          aria-label="Gate title"
          maxLength={120}
          className="h-8 min-w-0 flex-1 font-medium"
        />
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"><ArrowUp className="size-4" /></button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"><ArrowDown className="size-4" /></button>
          <button type="button" onClick={onRemove} disabled={count === 1} aria-label="Remove gate" className="rounded p-1.5 text-muted-foreground hover:bg-nogo-soft hover:text-nogo disabled:opacity-30"><Trash2 className="size-4" /></button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind of check">
          {kinds.map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={gate.kind === k.value}
              onClick={() => onChange(withKind(gate, k.value))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] transition-colors",
                gate.kind === k.value ? "border-primary bg-muted font-medium" : "text-muted-foreground hover:border-input hover:text-foreground",
              )}
            >
              <k.icon className="size-3.5" aria-hidden /> {k.label}
            </button>
          ))}
        </div>

        {gate.kind === "metric" && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Passes when</span>
            <Input
              value={gate.metric.signal}
              onChange={(e) => onChange({ ...gate, metric: { ...gate.metric, signal: e.target.value } })}
              placeholder="metric name, e.g. openSev1Sev2"
              aria-label="Metric name"
              className="h-8 w-56 font-mono text-[13px]"
            />
            <span className="text-muted-foreground">is</span>
            <select
              value={gate.metric.op}
              onChange={(e) => onChange({ ...gate, metric: { ...gate.metric, op: e.target.value as ComparisonOp } })}
              aria-label="Comparison"
              className={field}
            >
              {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <Input
              type="number"
              step="any"
              value={Number.isFinite(gate.metric.target) ? gate.metric.target : ""}
              onChange={(e) => onChange({ ...gate, metric: { ...gate.metric, target: e.target.value === "" ? NaN : Number(e.target.value) } })}
              aria-label="Target"
              className="h-8 w-24 font-mono text-[13px]"
            />
            <Input
              value={gate.metric.unit ?? ""}
              onChange={(e) => onChange({ ...gate, metric: { ...gate.metric, unit: e.target.value || undefined } })}
              placeholder="unit"
              aria-label="Unit"
              maxLength={8}
              className="h-8 w-20 text-[13px]"
            />
          </div>
        )}

        {gate.kind === "document" && (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Document</span>
              <Input
                value={gate.document.document}
                onChange={(e) => onChange({ ...gate, document: { ...gate.document, document: e.target.value } })}
                placeholder="e.g. rollback"
                aria-label="Document name"
                className="h-8 w-48 font-mono text-[13px]"
              />
            </div>
            <Textarea
              value={gate.document.question}
              onChange={(e) => onChange({ ...gate, document: { ...gate.document, question: e.target.value } })}
              placeholder="The question the AI must answer from the document, e.g. Does the rollback plan name an owner, a trigger and a time limit?"
              aria-label="Question for the AI"
              rows={2}
              maxLength={400}
            />
          </div>
        )}

        {gate.kind === "signoff" && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Passes when</span>
            <Input
              value={gate.signoff.role}
              onChange={(e) => onChange({ ...gate, signoff: { role: e.target.value } })}
              placeholder="role, e.g. Security"
              aria-label="Sign-off role"
              className="h-8 w-48 text-[13px]"
            />
            <span className="text-muted-foreground">approves</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-muted-foreground">Owner</span>
            <Input value={gate.owner} onChange={(e) => onChange({ ...gate, owner: e.target.value })} placeholder="e.g. QA lead" maxLength={60} className="h-8 w-40 text-[13px]" />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-muted-foreground">Area</span>
            <select value={gate.category} onChange={(e) => onChange({ ...gate, category: e.target.value as GateCategory } as Gate)} className={cn(field, "capitalize")}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={gate.blocking} onChange={(e) => onChange({ ...gate, blocking: e.target.checked })} className="size-4 accent-[var(--primary)]" />
            <span>Blocking</span>
            <span className="text-xs text-muted-foreground">{gate.blocking ? "a failure means No-Go" : "advisory: can only make it Conditional"}</span>
          </label>
        </div>
      </div>
    </fieldset>
  );
}
