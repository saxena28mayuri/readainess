import type {
  Gate,
  GateStatus,
  Recommendation,
  ReleaseType,
} from "@/lib/readiness/types";

export const releaseTypeLabel: Record<ReleaseType, string> = {
  cutover: "Cutover",
  peak: "Peak event",
  standard: "Standard release",
  custom: "Custom checklist",
};

export const recommendationLabel: Record<Recommendation, string> = {
  go: "Go",
  conditional: "Conditional",
  "no-go": "No-Go",
};

export const statusLabel: Record<GateStatus, string> = {
  pass: "Pass",
  fail: "Fail",
  unknown: "Unknown",
};

export const gateKindLabel: Record<Gate["kind"], string> = {
  metric: "Metric",
  document: "Document",
  signoff: "Sign-off",
};

/** "Nov 14, 2026" from an ISO date, without timezone drift. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Whole days from today (local) to an ISO date; negative when past. */
export function daysUntil(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

export function describeDaysUntil(iso: string): string {
  const days = daysUntil(iso);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1) return `in ${days} days`;
  if (days === -1) return "yesterday";
  return `${-days} days ago`;
}

export function timeAgo(ms: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - ms) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
