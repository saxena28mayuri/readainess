# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Designed for everyone who meets it, without splitting the product:

- **TPMs, release managers and engineering leads** running a go/no-go for a
  release, migration cutover or peak event. They need to see in seconds
  whether a release is ready, what is blocking it, and the evidence behind
  each call, then record a decision they can defend to executives.
- **Hiring managers and recruiters** evaluating the author's portfolio. They
  arrive with no key and no context and need to understand what the tool
  does, and see it working on realistic data, within a couple of minutes.

The product serves both by being a real working tool whose demo mode is
fully populated, so the first visit already shows the complete workflow.

## Product Purpose

ReadAIness collects release-readiness signals, checks them against gates
agreed in advance, and drafts a go/no-go memo in which every claim cites its
source. A person makes the final call. Success: a go/no-go decision that is
faster to reach, backed by evidence, and auditable afterwards.

## Positioning

Most AI status tools summarize; ReadAIness decides nothing on its own and
cannot claim readiness without evidence. Numbers are checked in code, the
LLM only judges documents and must quote them ("no quote, no pass"), a gate
with no evidence is Unknown rather than green, and every human override is
logged with a reason. Readiness gaps the GitHub ecosystem largely ignores
(release, cutover and peak readiness) are its focus.

## Operating Context

- Used before a release, cutover or peak event, typically in a readiness
  review or war-room meeting, often on a shared screen.
- Inputs: ticket metrics (open Sev1/Sev2, regression pass rate, latency),
  sign-offs by role, and documents such as rollback plans, cutover runbooks,
  vendor confirmations and on-call rotas.
- Outputs: a Go / Conditional / No-Go recommendation, a cited memo, and a
  recorded human decision.

## Capabilities and Constraints

- Gate kinds: metric (checked in code), sign-off (role approval), document
  (LLM judgement with a required quote). Gates are blocking or advisory.
- Roll-up: any failed blocking gate gives No-Go; any unknown blocking gate or
  any advisory issue gives Conditional; otherwise Go.
- Bring your own key: the user's OpenAI key is entered in Settings, stored
  only in their browser, and used for direct browser calls to OpenAI. The
  backend never receives or stores keys.
- Demo mode: without a key, the sample releases show precomputed AI results.
- Stack: Next.js, Tailwind, shadcn/ui, Convex, OpenAI GPT-5 nano by default,
  Vercel. Everything must run on free tiers.
- Terminology: release, gate, signal, evidence, sign-off, recommendation,
  decision, override, readiness check.

## Brand Commitments

- Name: ReadAIness. Tagline: "Evidence-backed go/no-go decisions for every
  release."
- Author credit: a small footer credit, "Built by Mayuri Saxena", with links
  to GitHub (github.com/saxena28mayuri) and LinkedIn
  (linkedin.com/in/saxena-mayuri). The product stays the focus.
- Should feel like a professional tool in the class of Linear, Vercel and
  Datadog, not a marketing site or a toy.

## Evidence on Hand

- Two synthetic sample releases in `src/lib/readiness/samples.ts`: an API
  gateway cutover (APAC) and a holiday peak readiness check (EMEA), each with
  deliberately planted gaps.
- No real customers, users, testimonials, metrics or company data. Never
  imply any; all names in sample data are fictional.

## Product Principles

1. **Evidence before verdicts.** Every status shows why, with its source.
2. **Humans decide.** The tool recommends; a person approves or overrides,
   with a reason.
3. **Unknown is not green.** Missing evidence is shown as a gap, never hidden.
4. **Fast to read under pressure.** The answer and the blockers come first.
5. **Free and private by default.** No paid services required; keys stay in
   the user's browser.
