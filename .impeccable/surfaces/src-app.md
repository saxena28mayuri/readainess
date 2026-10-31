---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: []
---

# App surface (releases, release readiness, settings)

Mode: Operate. Audience: TPMs and release managers running a go/no-go, plus
hiring managers seeing it in demo mode. Task: see the recommendation and its
blockers in seconds, inspect evidence per gate, run an AI review with their
own key, record a decision. Constraints: free tiers, BYOK in browser, demo
mode fully populated.

## Direction contract

THESIS: Readiness reviewed the way an auditor signs off. Every figure is
tickmarked back to its source and the recommendation reads as an opinion:
Go, Conditional, No-Go. Refuses the neutral SaaS dashboard of cards and pills.

OWN-WORLD: Deep working-paper green rail and header ink (#123d33), cool
green-grey ground, white working sheets with hairline rules, blue-pencil
tickmarks (#2747c9) as authored SVG glyphs with a legend, state colours only
for Go / Conditional / No-Go / Unknown, tabular mono figures.

STORY: The visitor sees the opinion first, then which gates are exceptions
and why, then the cited memo, then records a decision that stays on file.

FIRST VIEWPORT: Left green rail (wordmark, releases with status marks,
settings, demo-mode note, credit). Main sheet: release title row with target
date and the primary "Run readiness check" action at top right; opinion line
with recommendation word, one-sentence rationale and counts; dense gate table
with evidence column carrying tickmarks; legend beneath. Memo and decision in
a right column on wide screens.

FORM: Audit Working Paper, candidate 3 of 7 on the ordered list.
seed:14e55896ab890159. Signature move: blue-pencil tickmarks struck down the
evidence column in sequence when a check lands. Raises: superseded checks and
overrides stay visible struck through (from Ticket Wallet); history at one
fixed scale (from Botanical Folio); fixed gate furniture columns (from
Character Catalog); tabular mono data (from Datamatics).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
