import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

/** Shared reading layout for the privacy policy and terms. */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
    <article className="mx-auto w-full max-w-3xl px-5 pt-32 pb-24 sm:px-8">
      <p className="text-sm text-muted-foreground">Last updated {updated}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance">{title}</h1>
      <p className="mt-4 text-lg leading-8 text-muted-foreground text-pretty">{intro}</p>
      <div className="legal mt-12 space-y-10 text-[15px] leading-7 text-foreground/85 [&_a]:font-medium [&_a]:text-pencil [&_a]:underline [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_li]:mt-1.5 [&_p+p]:mt-3 [&_section>*+*]:mt-3 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </article>
      </main>
      <SiteFooter />
    </div>
  );
}
