"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/#evidence", label: "Evidence" },
  { href: "/#trust", label: "Privacy & security" },
];

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("text-[17px] font-semibold tracking-tight", className)}>
      Read<span className="text-pencil">AI</span>ness
    </Link>
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
          <Show when="signed-out">
            <Link href="/sign-in" className="hidden font-medium text-muted-foreground hover:text-foreground sm:inline">
              Sign in
            </Link>
            <Link href="/sign-up" className="rounded-md bg-primary px-3.5 py-2 font-medium text-primary-foreground transition-colors hover:bg-rail-raised">
              Get started
            </Link>
          </Show>
          <Show when="signed-in">
            <Link href="/releases" className="rounded-md bg-primary px-3.5 py-2 font-medium text-primary-foreground transition-colors hover:bg-rail-raised">
              Open app
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
