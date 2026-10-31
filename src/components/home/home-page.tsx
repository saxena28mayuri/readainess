"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Show } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { demoFiles } from "@/lib/landing/demo";
import { HeroWindow } from "@/components/home/hero-window";
import {
  ChecklistFragment,
  ImportFragment,
  LiveSheet,
  PollFragment,
  RuleMetric,
  RuleOverride,
  RuleQuote,
  RuleUnknown,
  KeyFragment,
} from "@/components/home/fragments";

const enter = (reduce: boolean | null, i = 0) => ({
  initial: reduce ? false : ({ opacity: 0, y: 20 } as const),
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-10% 0px" },
  transition: { duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] as const },
});

const steps = [
  {
    id: "gates",
    tab: "Agree the gates",
    title: "Agree what ready means before the meeting.",
    body: "Start from a cutover, peak-event or standard checklist and make it yours: bug thresholds, test pass rates, latency, rollback plans, sign-offs. Each gate is blocking or advisory.",
    stage: <ChecklistFragment />,
  },
  {
    id: "import",
    tab: "Bring the evidence",
    title: "Drop in the exports your tools already make.",
    body: "Jira, Azure DevOps and Linear CSVs, test reports, runbooks and approval emails, in any layout. AI finds where each value is; code reads it from the file and checks it.",
    stage: <ImportFragment />,
  },
  {
    id: "call",
    tab: "Make the call",
    title: "Poll every gate, then record who decided.",
    body: "Each gate answers Pass, Fail or Unknown with its evidence, and fixed rules give the recommendation. A named person records the decision, with a reason whenever it differs.",
    stage: <PollFragment />,
  },
];

const rules = [
  { title: "Numbers are checked in code.", body: "Bug counts, pass rates and latency are read from your export and compared with the target by the rules engine. No model decides whether one bug is more than zero.", proof: <RuleMetric /> },
  { title: "No quote, no pass.", body: "AI judges documents, but every judgement must quote the document word for word. The quote is checked against the text, and an invented one is thrown out.", proof: <RuleQuote /> },
  { title: "Unknown is never green.", body: "A gate with no evidence stays Unknown and never counts as a pass, so a release cannot go green because someone stayed quiet.", proof: <RuleUnknown /> },
  { title: "Every override has a reason.", body: "The tool recommends and a named person decides. Going against the recommendation needs a written reason, and the log is never edited.", proof: <RuleOverride /> },
];

const dataRows: { what: string; how: string; status: string }[] = [
  { what: "Releases, checklists and imported values", how: "Stored in your workspace; nothing is saved before you press Apply", status: "Kept" },
  { what: "Readiness checks and the decision log", how: "Every check and decision, with who made it and when", status: "Kept" },
  { what: "Your AI key, Gemini or OpenAI", how: "AES-256-GCM, bound to your account, never sent back to a browser", status: "Encrypted" },
  { what: "Each AI call", how: "Who, which release, model, tokens, time and result; never the content", status: "Logged" },
  { what: "Uploaded files, prompts and answers", how: "Passed to your AI provider to be read, then dropped", status: "Not kept" },
];

function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#1638b8" />
      <path d="M6.2 12.6c1.1.8 2.1 1.9 3 3.4 2.2-3.9 5-7.2 8.6-10" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const h2 = "text-[clamp(2rem,1.4rem+2.4vw,3.5rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance";
const section = "mx-auto max-w-[1280px] scroll-mt-6 px-[var(--m)] pt-[clamp(96px,12vw,176px)]";

export function HomePage() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [added, setAdded] = useState<string[]>(["jira"]);

  const toggle = (id: string) => setAdded((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-[#fafafa] text-[#0b1220] [--m:clamp(20px,4vw,48px)]">
        <header className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-[var(--m)] py-5">
          <Link href="/" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight">
            <Mark /> ReadAIness
          </Link>
          <nav aria-label="Site" className="hidden items-center gap-8 text-[15px] text-[#3d4456] md:flex">
            <a href="#how" className="transition-colors hover:text-[#0b1220]">How it works</a>
            <a href="#evidence" className="transition-colors hover:text-[#0b1220]">Evidence</a>
            <a href="#security" className="transition-colors hover:text-[#0b1220]">Security</a>
          </nav>
          <div className="flex items-center gap-3 text-[15px]">
            <Show when="signed-out">
              <Link href="/sign-in" className="hidden font-medium text-[#3d4456] hover:text-[#0b1220] sm:inline">Sign in</Link>
              <Link href="/sign-up" className="rounded-lg bg-[#1638b8] px-4 py-2 font-medium text-white transition-colors hover:bg-[#102b92] active:scale-[.98]">Start free</Link>
            </Show>
            <Show when="signed-in">
              <Link href="/releases" className="rounded-lg bg-[#1638b8] px-4 py-2 font-medium text-white transition-colors hover:bg-[#102b92]">Open your releases</Link>
            </Show>
          </div>
        </header>

        <main>
          <section className="mx-auto max-w-[1280px] px-[var(--m)] pt-[clamp(24px,4vw,56px)]">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-14">
              <motion.h1 {...enter(reduce)} className="text-[clamp(2.75rem,5.4vw,5rem)] leading-[0.98] font-semibold tracking-[-0.035em] text-balance">
                Release decisions you can defend.
              </motion.h1>
              <motion.div {...enter(reduce, 1)}>
                <p className="text-[clamp(1.0625rem,1rem+0.25vw,1.1875rem)] leading-[1.55] text-pretty text-[#2c3344]">
                  ReadAIness checks every release against the gates your team agreed, shows the evidence for each one, and
                  records who made the go/no-go call.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-lg bg-[#1638b8] px-5 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#102b92] active:scale-[.98]">
                    Start free <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  <a href="#try" className="rounded-lg bg-[#ecece7] px-5 py-3 text-[15px] font-medium transition-colors hover:bg-[#e2e2dc]">Try it on sample data</a>
                </div>
              </motion.div>
            </div>
            <motion.div {...enter(reduce, 2)} className="mt-[clamp(28px,3.5vw,48px)]">
              <HeroWindow />
              <p className="mt-3 text-[14px] text-[#525a6b]">A sample cutover being checked. Every result comes from the product’s rules engine.</p>
            </motion.div>
          </section>

          <section aria-labelledby="inputs-h" className="mx-auto max-w-[1280px] px-[var(--m)] pt-[clamp(72px,9vw,120px)]">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
              <motion.h2 id="inputs-h" {...enter(reduce)} className="text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-tight font-semibold tracking-[-0.02em]">
                Works from what your tools already export.
              </motion.h2>
              <motion.p {...enter(reduce, 1)} className="text-[18px] leading-[1.6] text-[#2c3344]">
                Issue exports from <b className="font-semibold text-[#0b1220]">Jira</b>, <b className="font-semibold text-[#0b1220]">Azure DevOps</b> and{" "}
                <b className="font-semibold text-[#0b1220]">Linear</b>, test reports and sign-off sheets as CSV or TSV, and rollback plans, runbooks
                and approval emails as text or Markdown. Any layout: the import works out where each value is, and shows you before
                anything is saved.
              </motion.p>
            </div>
          </section>

          <section id="how" aria-labelledby="how-h" className={section}>
            <motion.h2 id="how-h" {...enter(reduce)} className={cn(h2, "max-w-[18ch]")}>From scattered exports to a signed decision.</motion.h2>
            <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
              <div role="tablist" aria-label="How it works" className="flex flex-col gap-2">
                {steps.map((s, i) => (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={step === i}
                    aria-controls="how-stage"
                    onClick={() => setStep(i)}
                    className={cn("rounded-xl px-5 py-4 text-left transition-colors", step === i ? "bg-white text-[#0b1220]" : "text-[#3d4456] hover:bg-[#f2f2ee]")}
                  >
                    <span className="block text-[15px] font-semibold">{s.tab}</span>
                    <AnimatePresence initial={false}>
                      {step === i && (
                        <motion.span
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="block overflow-hidden"
                        >
                          <span className="mt-2 block text-[clamp(1.25rem,1.1rem+0.5vw,1.5rem)] leading-tight font-medium tracking-[-0.015em]">{s.title}</span>
                          <span className="mt-2 block text-[16px] leading-[1.55] text-[#2c3344]">{s.body}</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                ))}
              </div>
              <div id="how-stage" role="tabpanel" aria-label={steps[step].tab} className="relative grid min-h-[460px] place-items-center overflow-hidden rounded-2xl bg-[#ecece7] p-6 sm:p-10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={steps[step].id}
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="flex w-full justify-center"
                  >
                    {steps[step].stage}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </section>

          <section id="evidence" aria-labelledby="ev-h" className={section}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
              <motion.h2 id="ev-h" {...enter(reduce)} className={cn(h2, "max-w-[16ch]")}>It cannot say ready without proof.</motion.h2>
              <motion.p {...enter(reduce, 1)} className="text-[18px] leading-[1.6] text-[#2c3344]">
                Status meetings run on summaries. ReadAIness runs on evidence: every result shows where it came from, and four rules
                decide what counts.
              </motion.p>
            </div>
            <div className="mt-14 flex flex-col gap-[clamp(48px,6vw,88px)]">
              {rules.map((r, i) => (
                <article key={r.title} className="grid items-center gap-6 md:grid-cols-2 md:gap-16">
                  <motion.div {...enter(reduce)} className={cn(i % 2 === 1 && "md:order-2")}>
                    <h3 className="text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-tight font-semibold tracking-[-0.02em]">{r.title}</h3>
                    <p className="mt-3 max-w-[46ch] text-[17px] leading-[1.6] text-[#2c3344]">{r.body}</p>
                  </motion.div>
                  <motion.div {...enter(reduce, 1)} className="rounded-2xl bg-[#ecece7] p-[clamp(20px,3vw,40px)]">
                    <div className="mx-auto max-w-[460px]">{r.proof}</div>
                  </motion.div>
                </article>
              ))}
            </div>
          </section>

          <section id="try" aria-labelledby="try-h" className={section}>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
              <div>
                <motion.h2 id="try-h" {...enter(reduce)} className={h2}>Try it on real exports.</motion.h2>
                <motion.p {...enter(reduce, 1)} className="mt-5 max-w-[46ch] text-[17px] leading-[1.6] text-[#2c3344]">
                  Include any of three sample files. The check is mapped and polled by the same code the app runs; the AI step is
                  precomputed here, so you need no key.
                </motion.p>
                <div role="group" aria-label="Sample exports" className="mt-8 flex flex-col gap-2">
                  {demoFiles.map((f) => {
                    const on = added.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(f.id)}
                        className={cn("flex items-center justify-between gap-4 rounded-xl px-5 py-4 text-left transition-colors", on ? "bg-white" : "hover:bg-[#f2f2ee]")}
                      >
                        <span>
                          <span className="block text-[17px] font-semibold">{f.label}</span>
                          <span className="block text-[14px] text-[#525a6b]">{f.name}</span>
                        </span>
                        <span className={cn("rounded-md px-2.5 py-1 text-[13px] font-medium", on ? "bg-[#1638b8] text-white" : "bg-[#ecece7] text-[#3d4456]")}>
                          {on ? "Included" : "Include"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="self-start overflow-hidden rounded-2xl bg-[#ecece7] p-5 sm:p-8">
                <motion.div key={added.join(",")} initial={reduce ? false : { opacity: 0.5 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="[&_.h-sheet]:w-full [&_.h-sheet]:max-w-none">
                  <LiveSheet added={added} />
                </motion.div>
              </div>
            </div>
          </section>

          <section id="security" aria-labelledby="sec-h" className={section}>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
              <div>
                <motion.h2 id="sec-h" {...enter(reduce)} className={h2}>Built for the audit after the release.</motion.h2>
                <motion.p {...enter(reduce, 1)} className="mt-5 max-w-[46ch] text-[17px] leading-[1.6] text-[#2c3344]">
                  AI runs on our server with your own Gemini or OpenAI key. You are warned before any file is sent, and only the values
                  you apply are kept.
                </motion.p>
                <motion.p {...enter(reduce, 2)} className="mt-5 text-[15px] text-[#3d4456]">
                  Sign-in by Clerk · data in Convex ·{" "}
                  <Link href="/privacy" className="font-medium text-[#1638b8] underline underline-offset-4">Privacy policy</Link>
                </motion.p>

              </div>
              <motion.div {...enter(reduce, 1)} className="overflow-hidden rounded-2xl bg-white">
                <table className="w-full text-left text-[15px]">
                  <thead className="text-[13px] text-[#525a6b]">
                    <tr>
                      <th className="px-6 pt-5 pb-3 font-normal">Data</th>
                      <th className="px-6 pt-5 pb-3 text-right font-normal">Handling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.map((r) => (
                      <tr key={r.what} className="border-t border-[#efefeb] align-top">
                        <td className="px-6 py-4">
                          <span className="block font-medium">{r.what}</span>
                          <span className="mt-1 block text-[14px] text-[#525a6b]">{r.how}</span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <span className={cn("rounded-md px-2.5 py-1 text-[13px] font-medium", r.status === "Not kept" ? "bg-[#ecece7] text-[#3d4456]" : r.status === "Encrypted" ? "bg-[#e8edfb] text-[#1638b8]" : "bg-[#e2f4e9] text-[#1f6b44]")}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-[#f4f4f1] p-5"><KeyFragment /></div>
              </motion.div>
            </div>
          </section>

          <section aria-labelledby="close-h" className="mx-auto max-w-[1280px] px-[var(--m)] pt-[clamp(96px,12vw,176px)]">
            <div className="rounded-3xl bg-[#1638b8] px-[clamp(24px,5vw,72px)] py-[clamp(48px,7vw,96px)] text-white">
              <motion.h2 id="close-h" {...enter(reduce)} className="max-w-[18ch] text-[clamp(1.75rem,1.2rem+2.8vw,3.75rem)] leading-[1.04] font-semibold tracking-[-0.03em] text-balance">
                Run your next go/no&#8209;go on evidence.
              </motion.h2>
              <motion.div {...enter(reduce, 1)} className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[15px] font-semibold text-[#1638b8] transition-colors hover:bg-[#eef1fc] active:scale-[.98]">
                  Start free <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href="/sign-in" className="rounded-lg px-5 py-3 text-[15px] font-medium text-white underline-offset-4 hover:underline">Sign in</Link>
              </motion.div>
              <p className="mt-6 text-[15px] text-white/85">Free. Bring a free Gemini key or your own OpenAI key.</p>
            </div>
          </section>
        </main>

        <footer className="mx-auto max-w-[1280px] px-[var(--m)] pt-[clamp(64px,8vw,112px)] pb-10">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <p className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight"><Mark /> ReadAIness</p>
              <p className="mt-2 text-[15px] text-[#3d4456]">Evidence-backed go/no-go decisions for every release.</p>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-[#3d4456]">
              <Link href="/privacy" className="hover:text-[#0b1220]">Privacy</Link>
              <Link href="/terms" className="hover:text-[#0b1220]">Terms</Link>
              <a href="https://github.com/saxena28mayuri" target="_blank" rel="noreferrer" className="hover:text-[#0b1220]">GitHub</a>
              <a href="https://www.linkedin.com/in/saxena-mayuri/" target="_blank" rel="noreferrer" className="hover:text-[#0b1220]">LinkedIn</a>
            </nav>
          </div>
          <p className="mt-10 text-[14px] text-[#525a6b]">© 2026 · Built by Mayuri Saxena · Sample releases and figures are synthetic.</p>
        </footer>
      </div>
    </MotionConfig>
  );
}
