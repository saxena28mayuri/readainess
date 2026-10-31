import { describe, expect, it } from "vitest";
import { demoReviews } from "./demo";
import { evaluateRelease } from "./evaluate";
import { sampleReleases } from "./samples";

describe("demo reviews", () => {
  it("cover every sample release and every document gate", () => {
    for (const release of sampleReleases) {
      const review = demoReviews[release.slug];
      expect(review, release.slug).toBeDefined();
      const docGates = release.gates.filter((g) => g.kind === "document");
      expect(review.verdicts.map((v) => v.gateId).sort()).toEqual(
        docGates.map((g) => g.id).sort(),
      );
    }
  });

  it("only use quotes the rules engine accepts", () => {
    for (const release of sampleReleases) {
      const { results } = evaluateRelease(release, demoReviews[release.slug].verdicts);
      for (const result of results.filter((r) =>
        release.gates.find((g) => g.id === r.gateId)?.kind === "document",
      )) {
        expect(result.status, `${release.slug}/${result.gateId}`).not.toBe("unknown");
      }
    }
  });

  it("give the expected demo recommendations", () => {
    const rec = (slug: string) =>
      evaluateRelease(
        sampleReleases.find((r) => r.slug === slug)!,
        demoReviews[slug].verdicts,
      ).recommendation;
    expect(rec("api-gateway-cutover")).toBe("no-go");
    expect(rec("holiday-peak-readiness")).toBe("no-go");
    expect(rec("payments-sdk-upgrade")).toBe("conditional");
  });
});
