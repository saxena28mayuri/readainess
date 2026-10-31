"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { timeAgo } from "@/lib/format";
import { errorText } from "@/lib/settings";
import type { Release } from "@/lib/readiness/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const statusWord = { approved: "Approved", rejected: "Rejected", pending: "Reset to pending" } as const;

/**
 * Approve or reject a sign-off gate in the app. The person is taken from the
 * verified session on the server; every change is kept in the sign-off log.
 */
export function SignoffControls({
  releaseId,
  release,
  role,
}: {
  releaseId: Id<"releases">;
  release: Release;
  role: string;
}) {
  const { user } = useUser();
  const record = useMutation(api.releases.recordSignoff);
  const log = useQuery(api.releases.signoffLog, { releaseId });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approved" | "rejected" | "pending" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = release.signals.signoffs[role];
  const mine = log?.filter((e) => e.role === role) ?? [];

  async function act(status: "approved" | "rejected" | "pending") {
    setBusy(status);
    setError(null);
    try {
      await record({ releaseId, role, status, note, byName: user?.fullName ?? user?.primaryEmailAddress?.emailAddress });
      setNote("");
    } catch (err) {
      setError(errorText(err, "Could not record the sign-off."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 border-t border-rule pt-3">
      <p className="text-xs font-medium text-muted-foreground">
        Sign off as {role}
        {current ? ` · now ${current.status}${current.by ? ` (${current.by})` : ""}` : " · nobody has signed yet"}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (required to reject)"
          aria-label={`Note for the ${role} sign-off`}
          maxLength={300}
          className="h-8 w-64 text-[13px]"
        />
        <Button size="sm" onClick={() => act("approved")} disabled={busy !== null}>
          {busy === "approved" ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => act("rejected")} disabled={busy !== null || !note.trim()}>
          {busy === "rejected" ? <Loader2 className="animate-spin" aria-hidden /> : <X aria-hidden />}
          Reject
        </Button>
        {current && (
          <Button size="sm" variant="ghost" onClick={() => act("pending")} disabled={busy !== null}>
            <RotateCcw aria-hidden /> Reset
          </Button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-nogo">{error}</p>}
      {mine.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {mine.slice(0, 5).map((e) => (
            <li key={e.id}>
              <span className="font-medium text-foreground">{statusWord[e.status]}</span> by {e.by}, {timeAgo(e.at)}
              {e.note ? ` · “${e.note}”` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
