"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorText } from "@/lib/settings";
import { Button } from "@/components/ui/button";

/** Delete with an explicit confirmation that says what will be lost. */
export function DeleteRelease({
  releaseId,
  name,
  checks,
  decisions,
}: {
  releaseId: Id<"releases">;
  name: string;
  checks: number;
  decisions: number;
}) {
  const router = useRouter();
  const remove = useMutation(api.releases.remove);
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && !busy && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy]);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await remove({ releaseId });
      router.replace("/releases");
    } catch (err) {
      setError(errorText(err, "Could not delete the release."));
      setBusy(false);
    }
  }

  const lost = [
    checks > 0 && `${checks} readiness check${checks === 1 ? "" : "s"}`,
    decisions > 0 && `${decisions} recorded decision${decisions === 1 ? "" : "s"}`,
    "all imported data",
  ].filter(Boolean);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="lg"
        className="px-3 text-muted-foreground hover:bg-nogo-soft hover:text-nogo"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Trash2 aria-hidden /> Delete
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="alertdialog"
            aria-labelledby="delete-title"
            aria-describedby="delete-body"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 520, damping: 34 }}
            style={{ transformOrigin: "top right" }}
            className="absolute top-full right-0 z-40 mt-2 w-80 rounded-lg border border-t-[3px] border-t-nogo bg-sheet p-4 shadow-[0_20px_44px_-18px_rgba(18,61,51,0.55)]"
          >
            <p id="delete-title" className="text-sm font-semibold">Delete “{name}”?</p>
            <p id="delete-body" className="mt-1 text-[13px] leading-5 text-muted-foreground">
              This permanently removes the release, {lost.join(", ")}. It cannot be undone.
            </p>
            {error && <p role="alert" className="mt-2 text-[13px] text-nogo">{error}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <Button ref={cancelRef} variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={confirm} disabled={busy}>
                {busy && <Loader2 className="animate-spin" aria-hidden />} Delete release
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
