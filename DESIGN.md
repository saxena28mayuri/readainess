---
name: ReadAIness
description: Evidence-backed go/no-go decisions for every release, kept like an audit working paper.
colors:
  rail: "#123d33"
  rail-raised: "#1a4d41"
  rail-foreground: "#e6f0eb"
  rail-muted: "#9dbdb0"
  primary: "#123d33"
  primary-foreground: "#f2f7f4"
  ground: "#e9eeeb"
  sheet: "#ffffff"
  ink: "#13211b"
  ink-muted: "#4f6158"
  border: "#d3ddd7"
  rule: "#e4eae6"
  input: "#c7d3cc"
  secondary: "#e1e8e4"
  muted: "#eef2f0"
  pencil: "#2747c9"
  pencil-soft: "#e8ecfb"
  go: "#17724a"
  go-soft: "#e3f2ea"
  cond: "#8a5a0c"
  cond-soft: "#fbf0db"
  nogo: "#b3311f"
  nogo-soft: "#fbe7e3"
  unknown: "#5b6a63"
  unknown-soft: "#edf0ee"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, ui-sans-serif, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, ui-sans-serif, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
  body:
    fontFamily: "Geist, ui-sans-serif, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "24px"
  body-dense:
    fontFamily: "Geist, ui-sans-serif, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "Geist, ui-sans-serif, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  data:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: "20px"
    fontFeature: "tnum"
  gate-id:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "20px"
rounded:
  mark: "1px"
  sm: "3px"
  md: "4px"
  lg: "6px"
  xl: "8px"
spacing:
  cell-x: "12px"
  cell-edge: "16px"
  cell-y: "12px"
  sheet-pad: "16px"
  section-gap: "32px"
  column-gap: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    typography: "{typography.body}"
    height: "32px"
    padding: "0 10px"
  button-primary-lg:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 14px"
  button-outline:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "32px"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "4px 10px"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  rail-link:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-muted}"
    rounded: "{rounded.md}"
    typography: "{typography.body-dense}"
    padding: "6px 12px"
  rail-link-active:
    backgroundColor: "{colors.rail-raised}"
    textColor: "{colors.rail-foreground}"
  filter-segment-active:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  citation-chip:
    backgroundColor: "{colors.pencil-soft}"
    textColor: "{colors.pencil}"
    typography: "{typography.gate-id}"
    rounded: "{rounded.sm}"
    height: "18px"
    padding: "0 4px"
  history-cell:
    rounded: "{rounded.mark}"
    width: "24px"
    height: "8px"
---

# Design System: ReadAIness

## Overview

**Creative North Star: "The Audit Working Paper"**

Readiness is reviewed the way an auditor signs off. The recommendation reads as an opinion (Go, Conditional, No-Go), every figure is tickmarked back to its source in blue pencil, and every superseded call stays on file, struck through rather than erased. The working paper sits in a deep green binder rail on a cool green-grey ground; the sheets are white with hairline rules.

Density is high and calm: a dense gate table is the centre of gravity, set in a sans for reading and a tabular mono for anything a reviewer might tick against a source. Colour is scarce by rule. Green is the binder and the primary action, blue is the auditor's hand, and red, amber and green-for-Go appear only where they carry a verdict. The system is light only: it is used in readiness reviews on shared screens under office light.

**Key Characteristics:**
- Green rail and primary action; cool green-grey ground; white sheets with 1px hairline rules.
- Blue-pencil tickmarks as authored SVG strokes, always keyed to a printed legend.
- Verdict colours reserved for Go / Conditional / No-Go / Unknown, each with a soft tint.
- Geist Sans for language, Geist Mono with tabular numerals for data, figures and gate IDs.
- Superseded checks, recommendations and overridden calls stay visible, struck through.
- One signature motion: tickmarks strike down the evidence column when a new check lands.

## Colors

A green-binder palette with one hand-colour (pencil blue) and four verdict colours that only speak when there is a verdict.

### Primary
- **Binder Green** (rail / primary): the left rail, the mobile header bar, and the primary action ("Run readiness check", "Record decision", "Save key"). Also the selected border on option cards. **Rail Raised** marks the hovered and current rail link; **Rail Foreground** and **Rail Muted** are the rail's active and resting text.

### Secondary
- **Auditor's Pencil** (pencil): tickmark strokes, gate IDs (G1, G2...), memo citation chips, in-text links, the focus outline (2px, 2px offset), caret and text selection (pencil-soft). **Pencil Soft** is the citation chip fill and the row highlight when a memo citation scrolls a gate into view.

### Tertiary (verdicts)
- **Go Green** (go / go-soft): Go recommendation, Pass result, success confirmations.
- **Conditional Amber** (cond / cond-soft): Conditional recommendation and the "Override" tag in the decision log.
- **No-Go Red** (nogo / nogo-soft): No-Go, Fail, errors, destructive actions. A failed blocking gate row is tinted nogo-soft at 40%.
- **Unknown Slate** (unknown / unknown-soft): Unknown result, the "no evidence" tickmark, and every struck-through superseded verdict.

### Neutral
- **Working Ground** (ground): page background behind sheets.
- **Sheet White** (sheet): every working sheet, table, memo, decision panel and settings card.
- **Ink** / **Ink Muted**: body text / secondary text, column heads, metadata.
- **Border** (sheet outline), **Rule** (hairline between rows and figures, lighter than border), **Input** (field stroke and hover border).
- **Secondary** / **Muted**: active filter segment; latest history column, expanded gate detail row, saved-key panel.

### Named Rules
**The Verdict-Only Rule.** Go, Conditional, No-Go and Unknown colours appear only where they carry a verdict or state outcome. Never use them for decoration, category or emphasis.

**The One Hand Rule.** Pencil blue is the auditor's hand: tickmarks, gate IDs, citations, links, focus. It is never a fill for buttons or panels.

## Typography

**Display Font:** Geist (via next/font, `--font-geist-sans`)
**Body Font:** Geist
**Label/Mono Font:** Geist Mono (via next/font, `--font-geist-mono`)

**Character:** A plain, exact sans for the auditor's sentences and a tabular mono for the numbers they tick. Hierarchy comes from size and weight, never from a second display face.

### Hierarchy
- **Display** (600, 30px, line-height 1, tight tracking): the recommendation word in the opinion block only.
- **Headline** (600, 24px, tight tracking, balanced): page titles (release name, Releases, Settings).
- **Title** (600, 16px): section headings on sheets (Gates, Check history, Go/no-go memo, Decision).
- **Body** (400, 14px / 24px): findings, memo, summaries; rationale is 15px; prose capped at 60-70ch.
- **Body dense** (13px / 20px): table furniture, verdict tags, rail links, gate status words (600).
- **Label** (500, 12px): column heads, legend, metadata lines, sentence case, no letter-spacing.
- **Data** (Geist Mono, 12.5-13px, tabular-nums): evidence figures, counts, rules, dates, model names and keys.
- **Gate ID** (Geist Mono 500, 11px, pencil): G-numbers in the gate column and citation chips.

### Named Rules
**The Ledger Rule.** Mono is for data only: figures, counts, gate IDs, evidence lines, rules, model names and keys. Sentences, labels and headings are always sans. Every number a reviewer compares uses tabular numerals.

## Layout

App shell: a 256px sticky full-height green rail appears at `lg` (1024px); below `lg` it collapses to a green top bar with wordmark and two links, and the credit moves to the page foot. Content sits on the ground in a centred column: release pages up to 1680px, the releases index up to 72rem, settings up to 48rem, with 16px side padding (32px from `sm`).

Release page order is the story: title row (breadcrumb, name, target date, primary action top right), opinion block, gate table with legend, history strip. At `>=1600px` the memo and decision panel become a sticky 400px right column beside the gates; between `lg` and 1600px they sit below as a two-column pair; below `lg` they stack. The memo column only joins the gates when the table keeps its full width.

Tables keep a 900px (gates) / 720px (releases) minimum from `md`; below `md` each row restacks into a grid list so nothing scrolls sideways. Rhythm: 12px cell padding with 16px on table edges, 32px between sections in the main column, 24px between columns.

## Elevation & Depth

Flat working paper. Depth comes from tone (white sheet on green-grey ground) and 1px borders, not shadows. The two full tables carry a single hairline lift so the sheet reads as paper on the desk.

### Shadow Vocabulary
- **Sheet lift** (`box-shadow: 0 1px 2px rgba(19,33,27,0.05)`): the gate table and releases table only.

### Named Rules
**The Paper-On-Desk Rule.** Sheets are separated from the ground by tone and border. No floating cards, no hover lifts, no layered shadows.

## Shapes

Quiet, nearly square corners: 6px on sheets, tables, inputs and buttons; 4px on the opinion block, rail links and option cards; 3px on filter segments and citation chips; 1px on status squares and history cells. The opinion block carries a 3px top rule in its verdict colour. Rows and figures are divided by hairline rules, never by zebra stripes.

## Components

### Buttons
- **Shape:** gently squared (6px).
- **Primary:** binder green fill, near-white text, 32px high (36px for the page's main action, with a leading icon). Hover drops to 80% fill; active nudges down 1px.
- **Outline:** border on ground, hover to muted. **Destructive:** nogo at 10% fill with nogo text, never a solid red block.
- **Focus:** 2px pencil outline at 2px offset (global), plus a soft pencil ring on shadcn primitives.

### Inputs / Fields
- **Style:** 1px input-stroke, transparent on sheet, 6px corners, 32px high, pencil caret. Keys and model names set in mono.
- **Focus:** border shifts to pencil with a 3px pencil ring at 50%.
- **Option cards** (radio as card): 4px corners; selected takes a binder-green border (or the verdict colour for a decision call) on muted fill.

### Navigation
- **Rail:** wordmark (light square with a pencil-blue tick; "AI" picked out in light blue), "All releases", a Releases list where each item leads with its current recommendation icon on a small white square, then Settings, a demo-mode/key status box and the credit. Links are 13px rail-muted; hover and current go to rail-raised with rail-foreground text.

### Tickmark System (signature)
Four authored 20px SVG strokes, 2.3 stroke, round caps, deliberately irregular, drawn in pencil blue: **computed** (Agreed to source data, single tick), **quoted** (Traced to document, tick plus circle), **signed** (Signed off, tick plus underline), **none** (No evidence, dotted circle in unknown slate, never counted as a pass). A legend printed under the gate table names every mark in use. Every stroke carries `pathLength=1` so it can be drawn.

### Gate Result Mark
The result word leads (13px, 600, verdict colour) after an 8px square with 1px corners: filled for Pass and Fail, outlined for Unknown. The mark is a square so the only ticks in the gate table are the auditor's.

### Opinion Block
White sheet, 4px corners, 3px top rule in the verdict colour. Left: recommendation icon and word at display size in the verdict colour, then a one-sentence rationale. Right: a figures list (Gates passing, Blocking exceptions, Advisory exceptions) with hairline rules and mono tabular values. Footer line in label size states the check's provenance.

### Gate Table
Fixed furniture columns, identical for every gate of every release: Result (88px), Gate (24%, pencil G-number, title, expand chevron), Control (104px, Blocking/Advisory over gate kind), Owner (128px), Finding (fluid), Evidence (28%, tickmark then evidence lines: mono for computed figures, sans for quotes). A segmented filter (All / Exceptions / Passing with mono counts) sits above. Expanded detail rows sit on muted fill.

### History Strip
Every recorded check side by side at one fixed scale: one column per check, one 24x8px cell per gate in gate order, 3px apart, coloured by result. The latest column sits on muted; earlier columns drop to 45% opacity and their verdict word is struck through in unknown slate.

### Decision Log
Newest decision on top at full ink. Every earlier decision is greyed and its verdict struck through, tagged "Superseded". An override shows the struck recommendation, an arrow, then the decision, plus an amber "Override" tag. Nothing is deleted.

### Motion
One signature motion and nothing else decorative: when a new check lands, GSAP draws the non-empty tickmarks down the evidence column in row order (dash-offset 1 to 0, 0.45s, expo.out, 0.07s stagger, 0.1s delay) while status cells fade from 25% to full. It runs only under `prefers-reduced-motion: no-preference`; the global reduced-motion rule also collapses CSS transitions. Content is fully visible without it. Citation highlights fade over 700ms.

## Do's and Don'ts

### Do:
- **Do** key every verified figure to a blue-pencil tickmark and keep the legend on screen beneath the table.
- **Do** strike through superseded checks, recommendations and overridden calls in unknown slate; never remove them.
- **Do** set every comparable figure in Geist Mono with tabular numerals.
- **Do** keep the gate table's six furniture columns fixed across releases, and keep history at one scale.
- **Do** always state a verdict as a word; colour and icon only support it.

### Don't:
- **Don't** use Go, Conditional, No-Go or Unknown colours outside a verdict or state outcome.
- **Don't** draw checkmarks for gate results; the result mark is a square.
- **Don't** fill buttons or panels with pencil blue.
- **Don't** add a dark theme; the paper is light only for shared screens under office light.
- **Don't** lift sheets with shadows beyond the single sheet-lift hairline, or float cards on hover.
- **Don't** add decorative motion beyond the tickmark strike.
