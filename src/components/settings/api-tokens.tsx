"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { timeAgo } from "@/lib/format";
import { errorText } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const pushEndpoint = () => `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "https://<your-deployment>.convex.site"}/api/signals`;

/** Workspace tokens for pushing values from CI or scripts. */
export function ApiTokens() {
  const tokens = useQuery(api.apiTokens.list);
  const create = useMutation(api.apiTokens.create);
  const revoke = useMutation(api.apiTokens.revoke);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setFresh(await create({ name }));
      setName("");
      setCopied(false);
    } catch (err) {
      setError(errorText(err, "Could not create the token."));
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError("Copy failed. Select the token and copy it by hand.");
    }
  }

  const active = tokens?.filter((t) => !t.revokedAt) ?? [];

  return (
    <section aria-labelledby="tokens-heading" className="mt-6 rounded-lg border bg-sheet">
      <div className="border-b px-5 py-4">
        <h2 id="tokens-heading" className="text-base font-semibold">API tokens</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Let a pipeline or script send values, such as a test pass rate, straight to a release. Anyone with
          a token can write to your workspace’s releases, so keep it in your CI secrets.
        </p>
      </div>
      <div className="space-y-4 px-5 py-4">
        {fresh && (
          <div role="status" className="rounded-md border border-go/30 bg-go-soft px-4 py-3 text-sm">
            <p className="font-medium text-go">Copy this token now. It is shown once.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded bg-sheet px-2 py-1 font-mono text-xs break-all">{fresh}</code>
              <Button size="sm" variant="outline" onClick={() => copy(fresh)}>
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="token-name">Token name</Label>
            <Input id="token-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="GitHub Actions" maxLength={60} className="w-64" />
          </div>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <KeyRound aria-hidden />} Create token
          </Button>
        </form>
        {error && <p role="alert" className="text-sm text-nogo">{error}</p>}

        {active.length > 0 && (
          <ul className="divide-y divide-rule rounded-md border text-sm">
            {active.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <span>
                  <span className="font-medium">{t.name}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">rdy_…{t.last4}</span>
                  <span className="block text-xs text-muted-foreground">
                    Created {timeAgo(t.createdAt)} · {t.lastUsedAt ? `last used ${timeAgo(t.lastUsedAt)}` : "never used"}
                  </span>
                </span>
                <Button size="sm" variant="ghost" onClick={() => void revoke({ tokenId: t.id })}>Revoke</Button>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-md bg-muted px-4 py-3 text-[13px] leading-6">
          <p className="font-medium">Send a value from a pipeline</p>
          <pre className="mt-1.5 overflow-x-auto font-mono text-xs leading-5">{`curl -X POST "${pushEndpoint()}?release=<release-slug>" \\
  -H "Authorization: Bearer $READAINESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"metrics": {"regressionPassRate": 98.4}, "source": "CI run 123"}'`}</pre>
          <p className="mt-1.5 text-muted-foreground">
            Send <code className="font-mono">metrics</code>, <code className="font-mono">signoffs</code> or{" "}
            <code className="font-mono">documents</code>. Only names a gate on that release reads are accepted;
            a <code className="font-mono">GET</code> to the same URL lists them. The import page shows a snippet for each release.
          </p>
        </div>
      </div>
    </section>
  );
}
