# ReadAIness

Evidence-backed go/no-go decisions for releases, cutovers and peak events.

ReadAIness collects readiness signals, checks them against gates agreed in
advance, and drafts a go/no-go memo where every claim cites its source.
A person makes the final call.

## How it decides

- **Metric gates** (bug counts, pass rates, latency) are checked in code.
- **Sign-off gates** pass only when the named role has approved.
- **Document gates** (is the rollback plan complete? does the runbook name
  owners?) are judged by an LLM, which must quote the document. No quote, no pass.
- **Roll-up:** a failed blocking gate means No-Go; an unknown blocking gate or
  any advisory issue means Conditional; otherwise Go.

The rules engine lives in `src/lib/readiness` and is shared by the browser,
Convex functions and tests.

## Bring your own key

LLM calls run in the browser with the user's own OpenAI key, entered in
Settings and kept in their browser. Keys are never sent to or stored by the
backend. Without a key, the app runs in demo mode on the sample releases.

## Stack

Next.js, Tailwind, shadcn/ui, Convex, OpenAI (GPT-5 nano by default), Vercel.

## Getting started

```bash
npm install
npm run convex:login   # one-time browser approval
npm run convex         # first run creates the project and writes .env.local
npm run convex:seed    # loads the sample releases
npm run dev
```

The Convex scripts point `HOME` at a git-ignored `.convex-home` folder, so
this project keeps its own Convex login and never touches the one in
`~/.convex`. Only use this on a machine you trust: the login token is stored
in that folder.

```bash
npm test          # rules engine tests
npm run typecheck
```

All sample data is synthetic.
