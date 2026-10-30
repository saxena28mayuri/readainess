import type { Release } from "@/lib/readiness/types";
import { toCsv } from "./csv";

// Example files offered on the import page. Any layout works once a file is
// structured by AI; these show the kind of data each check needs.

/** A pre-filled template for this release's metric and sign-off gates. */
export function signalsTemplate(release: Release): string {
  const rows: (string | number)[][] = [["type", "key", "value", "by", "note"]];
  for (const gate of release.gates) {
    if (gate.kind === "metric") {
      rows.push(["metric", gate.metric.signal, release.signals.metrics[gate.metric.signal] ?? "", "", gate.title]);
    } else if (gate.kind === "signoff") {
      const s = release.signals.signoffs[gate.signoff.role];
      rows.push(["signoff", gate.signoff.role, s?.status ?? "pending", s?.by ?? "", s?.note ?? ""]);
    }
  }
  return toCsv(rows);
}
