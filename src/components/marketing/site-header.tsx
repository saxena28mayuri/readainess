"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/#evidence", label: "Evidence" },
  { href: "/#trust", label: "Privacy & security" },
];

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden>
      <rect width="24" height="24" rx="6" fill="#1638b8" />
      <path d="M6.2 12.6c1.1.8 2.1 1.9 3 3.4 2.2-3.9 5-7.2 8.6-10" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5 text-[17px] font-semibold tracking-tight", className)}>
      <Mark />
      <span>
        Read<span className="text-pencil">AI</span>ness
      </span>
    </Link>
  );
}

/** Sign-in links when signed out; the app link and the signed-in person when signed in. */
export function AuthControls({ cta = "Get started" }: { cta?: string }) {
  return (
    <>
      <Show when="signed-out">
        <Link href="/sign-in" className="hidden font-medium text-muted-foreground hover:text-foreground sm:inline">
          Sign in
        </Link>
        <Link href="/sign-up" className="rounded-md bg-primary px-3.5 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          {cta}
        </Link>
      </Show>
      <Show when="signed-in">
        <Link href="/releases" className="rounded-md bg-primary px-3.5 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          Open app
        </Link>
        <UserButton />
      </Show>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-6 px-5 sm:px-8">
        <Wordmark />
        <nav aria-label="Site" className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <AuthControls />
        </div>
      </div>
    </header>
  );
}
