import Link from "next/link";

/** Shared frame for the sign-in and sign-up screens. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-rail">
      <header className="px-6 py-5">
        <Link href="/" className="text-[15px] font-semibold tracking-tight text-rail-foreground">
          Read<span className="text-pencil">AI</span>ness
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">{children}</main>
      <footer className="flex justify-center gap-4 pb-6 text-xs text-rail-muted">
        <Link href="/privacy" className="hover:text-rail-foreground">Privacy</Link>
        <Link href="/terms" className="hover:text-rail-foreground">Terms</Link>
      </footer>
    </div>
  );
}
