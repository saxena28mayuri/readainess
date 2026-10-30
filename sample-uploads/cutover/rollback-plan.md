# Search service EU migration: rollback plan (v2)

**Owner:** Search platform on-call (primary), A. Lindqvist (secondary)

## Trigger
Roll back if, for 10 consecutive minutes after cutover:
- search error rate exceeds 1%, or
- p99 search latency exceeds 400 ms, or
- zero-result rate rises more than 3 percentage points above the legacy baseline.

## Steps
1. Set the `search.backend` traffic weight back to `legacy:100 / new:0` in the edge config.
2. Confirm legacy cluster health dashboards are green and query rate has recovered.
3. Pause dual-write to the new cluster so the legacy index stays authoritative.
4. Post the rollback notice in #search-cutover and page the incident commander.

## Time limit
Rollback must complete within 15 minutes of the trigger being met.

## Rehearsal
Rollback was rehearsed in staging-eu on 2 November 2026. The full rollback took 7 minutes, and legacy traffic was fully restored with no failed requests.
