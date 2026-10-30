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

## What you can do

- **Releases list:** every release with its recommendation, target date,
  blockers and gates passing.
- **Release view:** the recommendation and why, a gate table where each
  piece of evidence carries an auditor's tickmark (agreed to source data,
  traced to document, signed off, no evidence), a check history at one
  fixed scale, and a memo whose citations jump to the gate they cite.
- **Run a readiness check:** live AI review with your key, or demo results
  without one. The backend recomputes the recommendation from the evidence,
  and rejects AI quotes that do not appear in the document.
- **Record a decision:** Go, Conditional or No-Go. Overriding the
  recommendation needs a reason, and older decisions stay in the log,
  marked superseded. The decision is recorded under the signed-in user.
- **Create or copy a release:** start from a cutover, peak or standard
  checklist, or copy a sample to edit it.
- **Import data (needs an OpenAI key):** upload CSV, TSV, TXT or MD exports in
  any layout, or paste document text. The AI only says *where* each value is
  (which columns and values to count, which cell, which sentence); code then
  reads the value from the file and rejects anything it cannot verify. A
  preview shows every change with its source before you apply it. A one-time
  warning explains that files go from the browser to OpenAI.

Sign-in is by Clerk. Releases, checks and decisions belong to the signed-in
user; Convex derives the workspace from the verified session on every request.
(Clerk organizations are turned off; the backend would scope to an active
organization if they were enabled again.)

The public site is `/` (home), `/privacy` and `/terms`; the app lives under
`/releases` and `/settings` and requires sign-in.

## Bring your own key, kept on the server

Each user saves their own **Google Gemini** (default; free tier with a Google AI
Studio key, default model `gemini-flash-lite-latest`) or **OpenAI** key in
Settings. The key is tested, then stored in Convex encrypted with AES-256-GCM
(secret `AI_KEY_SECRET`, bound to the user id) and only ever decrypted inside
Convex actions (`convex/ai.ts`). All imports and reviews run there; the browser
never holds the key. Every AI call is logged in `aiLogs` as metadata only
(user, workspace, release, task, model, tokens, latency, result), shown to each
user under Settings → AI activity. On Gemini's free tier Google may use
submitted content to improve its products, which the app and privacy policy
say plainly. Without a key, the app runs in demo mode on the sample releases
and import is unavailable.

## Stack

Next.js, Tailwind, shadcn/ui, Convex, Clerk, GSAP, Google Gemini or OpenAI
(bring your own key), Vercel.

## Getting started

```bash
npm install
npm run convex:login   # one-time browser approval
npm run convex         # first run creates the project and writes .env.local
npm run convex:seed    # loads the sample releases
npm run dev
```

Set the key-encryption secret once per deployment:

```bash
HOME="$PWD/.convex-home" npx convex env set AI_KEY_SECRET "$(openssl rand -base64 32)"
```

Clerk: `HOME="$PWD/.clerk-home" npx clerk init` writes development keys to
`.env.local` (an unclaimed app until you run `npx clerk auth login` with the
same `HOME`). Then give Convex Clerk's issuer URL:

```bash
HOME="$PWD/.convex-home" npx convex env set CLERK_FRONTEND_API_URL https://<your-app>.clerk.accounts.dev
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
