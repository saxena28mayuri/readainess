# Holiday peak load test: summary (EMEA)

Run date: 6 November 2026, staging-emea, 3 hours sustained.

The forecast peak for the holiday sale is 2,400 orders per minute. We drove the platform at 1.6x forecast peak (3,840 orders per minute) for the full three hours.

Results:
- Checkout error rate at sustained load was 0.32%.
- p99 checkout latency held at 780 ms.
- Autoscaling reached 46 of the 60 allowed nodes.

One issue found: checkout times out for baskets over 40 items (bug 48211), tracked separately.
