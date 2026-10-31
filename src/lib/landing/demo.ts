import { csvRecords } from "@/lib/import/csv";
import {
  applyDocumentPlan,
  applyTablePlan,
  importTargets,
  itemsToPatch,
  type DocumentPlan,
  type StructuredFile,
  type TablePlan,
} from "@/lib/import/structure";
import { evaluateRelease } from "@/lib/readiness/evaluate";
import { apiGatewayCutover } from "@/lib/readiness/samples";
import type { DocumentVerdict, Evaluation, Release } from "@/lib/readiness/types";

// The home page demo. The AI's mapping plans are precomputed (so visitors need
// no key), but everything after that is the product's real code: values are
// read from these sample files and verified, then the rules engine decides.
// All names and figures are synthetic.

const GATE_IDS = ["sev-bugs", "test-pass", "rollback-plan", "security-signoff"];

export const demoRelease: Release = {
  ...apiGatewayCutover,
  name: "API gateway cutover (APAC)",
  gates: apiGatewayCutover.gates.filter((g) => GATE_IDS.includes(g.id)),
  signals: { metrics: {}, signoffs: {}, documents: {} },
};

export interface DemoFile {
  id: string;
  name: string;
  kind: "table" | "document";
  /** What the file is, as a person would say it. */
  label: string;
  text: string;
  plan: TablePlan | DocumentPlan;
  verdict?: DocumentVerdict;
}

const JIRA = [
  "Issue key,Summary,Issue Type,Status,Sev,Assignee",
  "GW-412,Checkout returns 502 through new gateway under burst,Bug,In Progress,S1,D. Okafor",
  "GW-415,Rate-limit header missing on partner routes,Bug,Done,S2,M. Chen",
  "GW-398,Stale CORS config on legacy route,Bug,Done,S1,M. Chen",
  "GW-420,Typo in deprecation banner,Bug,To Do,S4,L. Haddad",
  "GW-421,Partner sandbox endpoint,Story,To Do,S2,L. Haddad",
].join("\n");

const SIGNOFFS = [
  "Area\tResult\tOwner\tComment",
  "Regression suite\t98.6%\tQA automation\tNightly run 12 Nov, 1,204 tests",
  "Security review\tSigned off\tR. Iyer\tPen test findings closed",
  "Product owner\tPending\tS. Lee\tWaiting on partner comms",
].join("\n");

const ROLLBACK = `# Gateway rollback plan v4

Trigger: roll back if checkout error rate exceeds 1% for 5 minutes.
Owner: Platform on-call (primary), Gateway team lead (secondary).
Steps: flip api.apac DNS weight to the legacy gateway, confirm health, drain the new gateway.
Time limit: rollback completes within 15 minutes of the trigger.
Rehearsal: rehearsed in staging on 10 Nov; full rollback took 6 minutes.`;

export const demoFiles: DemoFile[] = [
  {
    id: "jira",
    name: "jira-gw-bugs.csv",
    kind: "table",
    label: "Jira issue export",
    text: JIRA,
    plan: {
      description: "Jira issue export, 5 issues",
      counts: [
        {
          key: "openSev1Sev2",
          filters: [
            { column: "Issue Type", values: ["Bug"] },
            { column: "Status", values: ["In Progress", "To Do"] },
            { column: "Sev", values: ["S1", "S2"] },
          ],
        },
      ],
    },
  },
  {
    id: "signoffs",
    name: "readiness-sheet.tsv",
    kind: "table",
    label: "Test results and sign-offs",
    text: SIGNOFFS,
    plan: {
      description: "Readiness sheet with test results and approvals",
      cells: [
        { group: "metric", key: "regressionPassRate", row: 1, column: "Result" },
        { group: "signoff", key: "Security", row: 2, column: "Result", byColumn: "Owner", noteColumn: "Comment" },
      ],
    },
  },
  {
    id: "rollback",
    name: "rollback-plan.md",
    kind: "document",
    label: "Rollback plan",
    text: ROLLBACK,
    plan: { description: "Gateway rollback plan", documentSlot: "rollback" },
    verdict: {
      gateId: "rollback-plan",
      status: "pass",
      reason: "Defines trigger, steps, owner, time limit and a completed rehearsal.",
      quote: "Rehearsal: rehearsed in staging on 10 Nov; full rollback took 6 minutes.",
    },
  },
];

export interface DemoState {
  release: Release;
  evaluation: Evaluation;
  files: StructuredFile[];
  /** Gate ids whose evidence came from the last file added. */
  touched: string[];
}

const targets = importTargets(demoRelease);

function structure(file: DemoFile): StructuredFile {
  if (file.kind === "table") {
    const table = csvRecords(file.text, file.name.endsWith(".tsv") ? "\t" : ",");
    return applyTablePlan(file.name, table, file.plan as TablePlan, targets);
  }
  return applyDocumentPlan(file.name, file.text, file.plan as DocumentPlan, targets);
}

/** Which gates a structured file feeds, by signal, role or document slot. */
function gatesFed(file: StructuredFile, release: Release): string[] {
  const keys = new Set(file.items.map((i) => `${i.group}:${i.key}`));
  return release.gates
    .filter((g) =>
      g.kind === "metric"
        ? keys.has(`metric:${g.metric.signal}`)
        : g.kind === "signoff"
          ? keys.has(`signoff:${g.signoff.role}`)
          : keys.has(`document:${g.document.document}`),
    )
    .map((g) => g.id);
}

export function demoState(addedIds: string[]): DemoState {
  const added = addedIds.flatMap((id) => demoFiles.filter((f) => f.id === id));
  const files = added.map(structure);
  const release: Release = { ...demoRelease, signals: itemsToPatch(files) };
  const verdicts = added.flatMap((f) => (f.verdict ? [f.verdict] : []));
  const last = files.at(-1);
  return {
    release,
    evaluation: evaluateRelease(release, verdicts),
    files,
    touched: last ? gatesFed(last, release) : [],
  };
}
