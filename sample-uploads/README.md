# Sample uploads for testing import

Synthetic exports for trying the import with an AI key. Every company, person and figure is made up. The files use different layouts on purpose (Jira and Azure DevOps style CSVs, a TSV test report, Markdown documents, an email, a Slack message), so the import has to work out where each value is.

## Cutover set (`cutover/`)

Use with a **Cutover or migration** release, for example "Search service migration (EU)". Upload all seven files at once.

| File | Feeds | What you should see |
|------|-------|---------------------|
| `jira-search-migration-bugs.csv` | No open Sev1/Sev2 bugs | **2** open: SRCH-1182 (In Progress, Sev 1) and SRCH-1190 (In Review, Sev 2). Done, Closed, Resolved and Won't Fix rows, Sev 3/4 rows and the Story are not counted. |
| `test-run-report.tsv` | Regression pass rate | **98.9** from the "Regression (full)" row |
| `perf-soak-results.csv` | p99 latency on the new path | **231** ms from the "Search queries, New cluster" row (the legacy row is 262) |
| `signoff-tracker.csv` | Security, Product Owner sign-offs | Security **approved** by Priya Nair; Product Owner **pending** |
| `security-approval-email.txt` | Security sign-off | Also **approved**, quoted from the email |
| `rollback-plan.md` | Rollback plan (document) | Attached; the AI review should **pass** it (trigger, steps, owner, time limit, rehearsal on 2 Nov) |
| `cutover-runbook.md` | Runbook owners (document) | Attached; the AI review should **fail** it, because step 6 has no escalation contact |

Expected result after a readiness check: **No-Go**. Two open Sev1/Sev2 bugs, the runbook gap and the pending Product Owner sign-off block it.

## Peak set (`peak/`)

Use with a **Peak event** release.

| File | Feeds | What you should see |
|------|-------|---------------------|
| `load-test-summary.md` | Load test multiplier, error rate under load | **1.6**x and **0.32**%, each quoted from the text |
| `vendor-capacity-confirmations.md` | Third-party rate limits (document) | Attached; the AI review should **fail** it, because TaxMate has not confirmed |
| `oncall-rota.md` | On-call coverage (document) | Attached; should **pass** (primary and secondary for every shift) |
| `sre-signoff-slack.txt` | SRE sign-off | **Approved** by Marta Kowalski, quoted from the message |
| `ado-peak-bugs.csv` | Nothing on this checklist | "Nothing in this file matches the checklist." The peak template has no bug-count check, so this shows unrelated files are ignored. Upload it to a cutover release instead and it counts **1** open Priority 1/2 bug. |

Expected result: **No-Go**, because the third-party limits gate is blocking and TaxMate is unconfirmed.

## Things worth checking

- Each value in "Changes to apply" says where it came from: the rule used to count rows, the row and column of a cell, or the exact quote.
- Suggestions the AI makes that cannot be verified are listed under "failed verification" and never applied.
- After applying, run a readiness check, then open Settings, AI activity, to see each call logged without its content.
