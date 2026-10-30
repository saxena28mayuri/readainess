# Search service EU migration: cutover runbook

Cutover window: Saturday 14 November 2026, 06:00 to 08:00 CET.
Incident commander: M. Brandt. Bridge: #search-cutover.

| Step | Time (CET) | Action | Owner | Escalation |
|------|-----------|--------|-------|------------|
| 1 | 06:00 | Freeze index writes on legacy and announce start | J. Ferreira | M. Brandt |
| 2 | 06:05 | Final delta sync legacy to new cluster | T. Okonkwo | A. Lindqvist |
| 3 | 06:25 | Verify document counts match within 0.1% | K. Moreau | T. Okonkwo |
| 4 | 06:35 | Shift 10% of traffic to new cluster | A. Lindqvist | M. Brandt |
| 5 | 06:50 | Shift 50% of traffic, watch error and latency dashboards | A. Lindqvist | M. Brandt |
| 6 | 07:10 | Shift 100% of traffic to new cluster | A. Lindqvist | |
| 7 | 07:30 | Re-enable writes on new cluster, disable dual-write | R. Haddad | T. Okonkwo |
| 8 | 07:45 | Announce completion and hand over to day on-call | M. Brandt | Head of Platform |
