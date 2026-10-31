import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What ReadAIness stores, what goes to the AI provider you choose, and how your key is protected.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="30 October 2026"
      intro="ReadAIness helps teams decide whether a release is ready. This policy explains what we store, what is sent to the AI provider you choose, and how your key is protected."
    >
      <section>
        <h2>The short version</h2>
        <ul>
          <li>Your AI provider key (Google Gemini or OpenAI) is encrypted and stored on our server, used only for your own requests, and never sent back to a browser.</li>
          <li>When you import a file or run an AI review, our server sends that content to the provider you chose, using your key. We do not keep the files; only the values you apply are stored.</li>
          <li>We log metadata about each AI call (who, when, which model, tokens, time, success or error), never the files, prompts or answers.</li>
          <li>We store your account, your releases, the values and documents you choose to apply, and the checks and decisions you record.</li>
          <li>We do not sell data, show ads, or use third-party analytics or tracking.</li>
        </ul>
      </section>

      <section>
        <h2>Who we are</h2>
        <p>
          ReadAIness is built and operated by Mayuri Saxena. For any privacy question or request,
          contact us through{" "}
          <a href="https://www.linkedin.com/in/saxena-mayuri/" target="_blank" rel="noreferrer">LinkedIn</a>.
        </p>
      </section>

      <section>
        <h2>What we store</h2>
        <ul>
          <li><strong>Account details.</strong> Your name, email address, profile image and sign-in details, held by our authentication provider, Clerk.</li>
          <li><strong>Workspace content.</strong> Releases you create or copy, the metrics, sign-offs and documents you apply from an import, readiness checks (results, AI verdicts and memos) and decisions, with who made them and when. Stored in our database provider, Convex.</li>
          <li><strong>Your AI key.</strong> Encrypted with AES-256-GCM, bound to your account, and stored with your chosen provider and model. Only the last four characters are ever shown. Removing the key in Settings deletes it.</li>
          <li><strong>AI activity logs.</strong> For each AI call: your user and workspace, the release, the task, provider, model, token counts, duration, and whether it succeeded. No content.</li>
          <li><strong>Browser settings.</strong> Your import acknowledgement is kept in your browser’s local storage.</li>
        </ul>
      </section>

      <section>
        <h2>What goes to your AI provider</h2>
        <p>
          AI features run on our server with your own key for the provider you choose in Settings:
          Google Gemini or OpenAI. When you add a file to an import, our server sends its contents to that
          provider so the columns and sentences can be mapped onto your
          checklist. When you run an AI review, the documents attached to the release and the check
          results are sent to that provider to judge document gates and draft a memo.
        </p>
        <p>
          These requests are made under your own account, so that provider’s terms govern them,
          including retention: the{" "}
          <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Gemini API terms</a>{" "}
          or{" "}
          <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noreferrer">OpenAI’s privacy policy</a>.
        </p>
        <p>
          <strong>Gemini free tier:</strong> when a Gemini key has no billing set up, Google may use the
          content you send and the responses to improve its products, and human reviewers may read
          them. Google applies its paid-service terms instead in the EEA, Switzerland and the UK, and
          once billing is set up. Use OpenAI or a paid Gemini key for confidential material.
        </p>
        <p>
          Do not import customer
          personal data, credentials or anything your organization does not allow to leave its systems.
        </p>
      </section>

      <section>
        <h2>Why we use your data</h2>
        <ul>
          <li>To provide the service: sign you in, keep your releases separate from everyone else’s, and show your history.</li>
          <li>To keep a reliable audit trail of checks and decisions, which is the purpose of the product.</li>
          <li>To keep the service secure and to fix problems.</li>
        </ul>
        <p>We rely on performing our agreement with you and on our legitimate interest in running a secure service.</p>
      </section>

      <section>
        <h2>Service providers</h2>
        <ul>
          <li><strong>Clerk</strong> for sign-in and accounts.</li>
          <li><strong>Convex</strong> for the database and backend.</li>
          <li><strong>Vercel</strong> for hosting the website.</li>
          <li><strong>Google (Gemini) or OpenAI</strong>, only under your own account and key, as described above.</li>
        </ul>
        <p>These providers may process data in the United States and other countries, under their own security and data-protection commitments.</p>
      </section>

      <section>
        <h2>Cookies and storage</h2>
        <p>
          We use only what is needed to run the product: Clerk’s session cookies to keep you signed in,
          and browser storage for your settings. There are no advertising or analytics cookies, so there
          is nothing to opt out of.
        </p>
      </section>

      <section>
        <h2>Retention and deletion</h2>
        <p>
          Decisions are designed never to be edited or deleted inside the product, so the record stays
          trustworthy. We keep your content while your account is active. You can
          delete your account from your profile at any time, and you can ask us to delete your
          workspace content. Clear your browser storage, or use Forget key in Settings, to remove the
          key from your device.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, export or delete your
          personal data, and to object to or restrict how we use it. Contact us to make a request. You
          can also complain to your local data-protection authority.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We will update this page when our practices change and revise the date at the top. See also
          our <Link href="/terms">terms of service</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
