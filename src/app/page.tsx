import { evaluateRelease } from "@/lib/readiness/evaluate";
import { sampleReleases } from "@/lib/readiness/samples";

// Placeholder until the real dashboard is designed. Runs the rules engine
// on the sample releases so the scaffold shows the core logic working.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">ReadAIness</h1>
      <p className="mt-2 text-muted-foreground">
        Evidence-backed go/no-go decisions for every release.
      </p>
      <ul className="mt-10 space-y-4">
        {sampleReleases.map((release) => {
          const { recommendation, blockers, warnings } =
            evaluateRelease(release);
          return (
            <li key={release.slug} className="rounded-lg border p-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-medium">{release.name}</h2>
                <span className="font-mono text-sm uppercase">
                  {recommendation}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {blockers.length} blockers, {warnings.length} warnings, before
                AI review
              </p>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
