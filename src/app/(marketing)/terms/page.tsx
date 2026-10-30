import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms for using ReadAIness.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated="30 October 2026"
      intro="These terms apply when you use ReadAIness. By creating an account or using the service, you agree to them."
    >
      <section>
        <h2>The service</h2>
        <p>
          ReadAIness checks a release against readiness gates agreed in advance and recommends Go,
          Conditional or No-go. Metric and sign-off gates are evaluated in code; document gates are
          judged by an AI model you choose, which must quote the document for every judgement.
        </p>
      </section>

      <section>
        <h2>You make the decision</h2>
        <p>
          A recommendation is decision support, not a decision. AI output can be wrong, and the result
          is only as good as the data you import. You and your organization remain responsible for
          every release decision, for checking the evidence, and for any outcome of shipping or not
          shipping.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>Keep your sign-in details secure; you are responsible for activity under your account.</li>
          <li>You must be allowed by your employer to use the service for their work.</li>
        </ul>
      </section>

      <section>
        <h2>Your content</h2>
        <p>
          You keep all rights to the releases, files and documents you bring in. You give us permission
          to store and process them only to provide the service to you. You confirm you
          have the right to upload them, and that sending them to your chosen AI provider with your key is permitted by
          your organization.
        </p>
      </section>

      <section>
        <h2>Your AI provider key</h2>
        <p>
          AI features use your own Google Gemini or OpenAI key, which we store encrypted and use only
          for your requests. Usage counts against your quota or bill with that provider and is governed
          by your agreement with them, including how a free tier may use your content. You can remove
          the key in Settings at any time.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <ul>
          <li>Do not upload data you are not permitted to share, including other people’s personal data without a lawful basis.</li>
          <li>Do not attempt to access another workspace’s data, disrupt the service, or probe it for vulnerabilities without permission.</li>
          <li>Do not use the service to break the law.</li>
        </ul>
      </section>

      <section>
        <h2>Availability and changes</h2>
        <p>
          The service is provided free of charge and “as is”, without warranties of any kind. We may
          change, suspend or discontinue features, and will try to give notice of significant changes.
          We may suspend accounts that break these terms.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          To the extent the law allows, we are not liable for indirect or consequential losses, or for
          losses arising from release decisions made with the service. Nothing in these terms limits
          liability that cannot be limited by law.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms: reach us through{" "}
          <a href="https://www.linkedin.com/in/saxena-mayuri/" target="_blank" rel="noreferrer">LinkedIn</a>.
          How we handle data is described in the <Link href="/privacy">privacy policy</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
