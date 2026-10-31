"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Check, ExternalLink, Eye, EyeOff, Info, Loader2, Lock } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { providerInfo, type Provider } from "@/lib/ai/provider";
import { errorText, useAiKey } from "@/lib/settings";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = { kind: "idle" } | { kind: "busy"; label: string } | { kind: "ok"; label: string } | { kind: "error"; message: string };

const providerChoices: { value: Provider; label: string; hint: string }[] = [
  { value: "gemini", label: "Google Gemini", hint: "Free tier with a Google AI Studio key." },
  { value: "openai", label: "OpenAI", hint: "Paid per use. Not used for training by default." },
];

const taskLabel = { import: "Import", review: "Review", "key-test": "Key test", models: "Model list" } as const;

export default function SettingsPage() {
  const { status: saved, hasKey, loading } = useAiKey();
  const saveKey = useAction(api.ai.saveKey);
  const setModel = useAction(api.ai.setModel);
  const listModels = useAction(api.ai.listModels);
  const forgetKey = useMutation(api.ai.forgetKey);
  const logs = useQuery(api.ai.recentLogs);

  const [providerDraft, setProviderDraft] = useState<Provider | null>(null);
  const [draft, setDraft] = useState("");
  const [modelDraft, setModelDraft] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [models, setModels] = useState<string[] | null>(null);

  const provider = providerDraft ?? saved?.provider ?? "gemini";
  const info = providerInfo[provider];
  const savedForThisProvider = saved && saved.provider === provider;

  // For a saved Gemini key, offer the models it can actually call.
  useEffect(() => {
    let cancelled = false;
    if (saved?.provider !== "gemini") return;
    listModels({})
      .then((list) => !cancelled && setModels(list))
      .catch(() => !cancelled && setModels(null));
    return () => {
      cancelled = true;
    };
  }, [saved?.provider, saved?.savedAt, listModels]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setStatus({ kind: "busy", label: "Testing and saving…" });
    try {
      const out = await saveKey({ provider, apiKey: draft, model: modelDraft.trim() || undefined });
      setDraft("");
      setModelDraft("");
      setProviderDraft(null);
      setStatus({ kind: "ok", label: `Saved. Key works with ${out.model}.` });
    } catch (err) {
      setStatus({ kind: "error", message: errorText(err, "Could not save the key.") });
    }
  }

  async function chooseModel(model: string) {
    setStatus({ kind: "busy", label: `Testing ${model}…` });
    try {
      await setModel({ model });
      setStatus({ kind: "ok", label: `Now using ${model}.` });
    } catch (err) {
      setStatus({ kind: "error", message: errorText(err, "That model did not work.") });
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 lg:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
        ReadAIness runs AI imports and reviews on its server with your own API key, so
        usage is yours to control and every call is logged.
      </p>

      <section aria-labelledby="key-heading" className="mt-8 rounded-lg border bg-sheet">
        <div className="border-b px-5 py-4">
          <h2 id="key-heading" className="text-base font-semibold">AI provider and key</h2>
          <p className="mt-1 flex items-start gap-2 text-[13px] leading-5 text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0 text-go" aria-hidden />
            Your key is encrypted and stored on the ReadAIness server, used only for your own
            requests, and never sent back to any browser, including yours.
          </p>
        </div>

        <div className="space-y-5 px-5 py-5">
          {saved && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted px-3 py-2.5 text-sm">
              <span>
                {providerInfo[saved.provider].label} key ending{" "}
                <span className="font-mono">…{saved.last4}</span>
                <span className="text-muted-foreground"> · saved {timeAgo(saved.savedAt)}</span>
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  await forgetKey({});
                  setModels(null);
                  setStatus({ kind: "idle" });
                }}
              >
                Remove key
              </Button>
            </div>
          )}

          <fieldset>
            <legend className="text-sm font-medium">Provider</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {providerChoices.map((p) => (
                <label
                  key={p.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pencil",
                    provider === p.value ? "border-primary bg-muted" : "hover:border-input",
                  )}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={p.value}
                    checked={provider === p.value}
                    onChange={() => {
                      setProviderDraft(p.value);
                      setStatus({ kind: "idle" });
                    }}
                    className="mt-1 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="font-medium">{p.label}</span>
                    <span className="block text-xs text-muted-foreground">{p.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {provider === "gemini" && (
              <p className="mt-3 flex items-start gap-2 rounded-md bg-cond-soft px-3 py-2.5 text-[13px] leading-5 text-foreground/85">
                <Info className="mt-0.5 size-4 shrink-0 text-cond" aria-hidden />
                On Gemini’s free tier, Google may use what you send to improve its products, and
                people may review it. That does not apply once billing is set up on the key, or in
                the EEA, Switzerland and the UK. Choose OpenAI or a paid Gemini key for confidential work.
              </p>
            )}
          </fieldset>

          {savedForThisProvider && provider === "gemini" && models && models.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="model-select">Model</Label>
              <select
                id="model-select"
                value={models.includes(saved.model) ? saved.model : ""}
                onChange={(e) => void chooseModel(e.target.value || info.defaultModel)}
                disabled={status.kind === "busy"}
                className="h-8 w-full max-w-sm rounded-md border border-input bg-sheet px-2 font-mono text-[13px]"
              >
                <option value="">{info.defaultModel} (recommended)</option>
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
          {savedForThisProvider && provider === "openai" && (
            <p className="text-sm text-muted-foreground">
              Model <span className="font-mono text-foreground">{saved.model}</span>. To change it, save the key again with a different model.
            </p>
          )}

          <form onSubmit={onSave} className="space-y-4 border-t pt-5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Label htmlFor="api-key">{savedForThisProvider ? `Replace ${info.label} key` : `${info.label} API key`}</Label>
                <a href={info.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-pencil underline underline-offset-2">
                  Get a key <ExternalLink className="size-3" aria-hidden />
                </a>
              </div>
              <div className="relative">
                <Input
                  id="api-key"
                  type={show ? "text" : "password"}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={info.keyPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  className="pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide key" : "Show key"}
                  className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">
                Model <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="model"
                value={modelDraft}
                onChange={(e) => setModelDraft(e.target.value)}
                placeholder={info.defaultModel}
                spellCheck={false}
                className="max-w-xs font-mono"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={!draft.trim() || status.kind === "busy" || loading}>
                {savedForThisProvider || hasKey ? "Test and replace key" : "Test and save key"}
              </Button>
              {status.kind === "busy" && (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> {status.label}
                </span>
              )}
              {status.kind === "ok" && (
                <span role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-go">
                  <Check className="size-4" aria-hidden /> {status.label}
                </span>
              )}
              {status.kind === "error" && <span role="alert" className="text-sm text-nogo">{status.message}</span>}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              The key is checked with {info.label} before it is saved. Saving replaces any key you saved before.
            </p>
          </form>
        </div>
      </section>

      <section aria-labelledby="logs-heading" className="mt-6 rounded-lg border bg-sheet">
        <div className="border-b px-5 py-3">
          <h2 id="logs-heading" className="text-base font-semibold">AI activity</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Your last 25 AI calls. Metadata only: no files, prompts or answers are logged.</p>
        </div>
        {!logs || logs.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">No AI calls yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="px-5 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Task</th>
                  <th className="px-3 py-2 font-medium">Model</th>
                  <th className="px-3 py-2 text-right font-medium">Tokens in / out</th>
                  <th className="px-3 py-2 text-right font-medium">Time</th>
                  <th className="px-5 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {logs.map((l) => (
                  <tr key={l._id}>
                    <td className="px-5 py-2 whitespace-nowrap text-muted-foreground">{timeAgo(l._creationTime)}</td>
                    <td className="px-3 py-2">{taskLabel[l.task]}</td>
                    <td className="px-3 py-2 font-mono text-[12px]">{l.model}</td>
                    <td className="px-3 py-2 text-right font-mono text-[12px] tabular-nums">
                      {l.inputTokens ?? "—"} / {l.outputTokens ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[12px] tabular-nums">{(l.latencyMs / 1000).toFixed(1)}s</td>
                    <td className={cn("px-5 py-2", l.ok ? "text-go" : "text-nogo")}>{l.ok ? "OK" : l.error ?? "Failed"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="data-heading" className="mt-6 rounded-lg border bg-sheet px-5 py-4">
        <h2 id="data-heading" className="text-base font-semibold">Your data</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-6 text-muted-foreground">
          <li>Without a key, checks use precomputed demo results for the sample releases, and import is unavailable.</li>
          <li>Releases, checks and decisions belong to your account. No one else can see them.</li>
          <li>Uploaded files pass through our server to your AI provider and are not stored; only the values you apply are kept.</li>
        </ul>
      </section>
    </div>
  );
}
