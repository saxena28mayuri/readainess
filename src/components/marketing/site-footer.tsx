import Link from "next/link";
import { Wordmark } from "@/components/marketing/site-header";

export function SiteFooter() {
  return (
    <footer className="border-t bg-sheet">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1fr_auto_auto]">
        <div className="max-w-sm">
          <Wordmark />
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Evidence-backed go/no-go decisions for every release.
          </p>
        </div>
        <nav aria-label="Product" className="space-y-2 text-sm">
          <p className="font-medium">Product</p>
          <Link href="/sign-up" className="block text-muted-foreground hover:text-foreground">Get started</Link>
          <Link href="/sign-in" className="block text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link href="/#how" className="block text-muted-foreground hover:text-foreground">How it works</Link>
        </nav>
        <nav aria-label="Legal" className="space-y-2 text-sm">
          <p className="font-medium">Legal</p>
          <Link href="/privacy" className="block text-muted-foreground hover:text-foreground">Privacy policy</Link>
          <Link href="/terms" className="block text-muted-foreground hover:text-foreground">Terms of service</Link>
        </nav>
      </div>
      <div className="mx-auto flex max-w-[1320px] flex-wrap justify-between gap-3 border-t px-5 py-5 text-xs text-muted-foreground sm:px-8">
        <p>
          Built by Mayuri Saxena ·{" "}
          <a href="https://github.com/saxena28mayuri" target="_blank" rel="noreferrer" className="underline decoration-current/40 hover:decoration-current">GitHub</a>{" "}
          ·{" "}
          <a href="https://www.linkedin.com/in/saxena-mayuri/" target="_blank" rel="noreferrer" className="underline decoration-current/40 hover:decoration-current">LinkedIn</a>
        </p>
      </div>
    </footer>
  );
}
