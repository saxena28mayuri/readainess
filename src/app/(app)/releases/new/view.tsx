"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { gateKindLabel } from "@/lib/format";
import { releaseTemplates } from "@/lib/readiness/templates";
import type { ReleaseType } from "@/lib/readiness/types";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const types: { value: ReleaseType; label: string; hint: string }[] = [
  { value: "cutover", label: "Cutover or migration", hint: "Moving traffic or data to a new system." },
  { value: "peak", label: "Peak event", hint: "Getting ready for a traffic spike such as a sale." },
  { value: "standard", label: "Standard release", hint: "A regular feature or dependency release." },
];

export default function NewReleasePage() {
  const router = useRouter();
  const create = useMutation(api.releases.create);
  const [name, setName] = useState("");
  const [type, setType] = useState<ReleaseType>("cutover");
  const [targetDate, setTargetDate] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Give the release a name.");
    if (!targetDate) return setError("Choose a target date.");
    setError(null);
    setSaving(true);
    try {
      const slug = await create({ name, type, targetDate, summary });
      router.push(`/releases/${slug}/import`);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0].replace(/^.*Uncaught Error: /, "") : "Could not create the release.");
      setSaving(false);
    }
  }

  const gates = releaseTemplates[type];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 lg:py-8">
      <Link href="/releases" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden /> All releases
      </Link>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">New release</h1>
      <p className="mt-1.5 max-w-[70ch] text-sm leading-6 text-muted-foreground">
        Pick the kind of release to start from a standard readiness checklist.
        Next you will import the data each check needs.
      </p>

      <form onSubmit={submit} noValidate className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5 rounded-lg border bg-sheet p-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">Release name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Search service migration (EU)" maxLength={120} />
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Kind of release</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {types.map((t) => (
                <label
                  key={t.value}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-md border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pencil",
                    type === t.value ? "border-primary bg-muted" : "hover:border-input",
                  )}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="type"
                      value={t.value}
                      checked={type === t.value}
                      onChange={() => setType(t.value)}
                      className="accent-[var(--primary)]"
                    />
                    {t.label}
                  </span>
                  <span className="text-xs leading-5 text-muted-foreground">{t.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="target-date">Target date</Label>
            <DatePicker id="target-date" value={targetDate} onChange={setTargetDate} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="summary">
              What is shipping <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} maxLength={600} />
          </div>

          {error && <p role="alert" className="text-sm text-nogo">{error}</p>}

          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="animate-spin" aria-hidden />}
            Create and import data
          </Button>
        </div>

        <aside className="rounded-lg border bg-sheet">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Starting checklist</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{gates.length} gates, all Unknown until data arrives.</p>
          </div>
          <ol className="divide-y divide-rule">
            {gates.map((g, i) => (
              <li key={g.id} className="flex gap-2 px-4 py-2 text-[13px] leading-5">
                <span className="font-mono text-[11px] leading-5 text-pencil">G{i + 1}</span>
                <span>
                  {g.title}
                  <span className="block text-xs text-muted-foreground">
                    {g.blocking ? "Blocking" : "Advisory"} · {gateKindLabel[g.kind]}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </form>
    </div>
  );
}
