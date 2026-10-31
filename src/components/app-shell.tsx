"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { ChevronsUpDown, FileText, KeyRound, LayoutList, LogOut, Plus, Settings, Shield, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiKey } from "@/lib/settings";
import { currentView, useReleases } from "@/lib/use-checks";
import { RecommendationIcon, recTextTone } from "@/components/verdict";

function Wordmark() {
  return (
    <Link
      href="/releases"
      className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-rail-foreground"
    >
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
        <rect x="1" y="1" width="18" height="18" rx="5" fill="#1638b8" />
        <path
          d="M5 10.5 8.4 13.8 15 6.6"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        Read<span className="text-pencil">AI</span>ness
      </span>
    </Link>
  );
}

function ReleaseNavSkeleton() {
  return (
    <div className="space-y-2 px-3" aria-busy>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-7 rounded-md bg-rail-raised/70" />
      ))}
    </div>
  );
}

function ReleaseNav() {
  const pathname = usePathname();
  const { releases, latest } = useReleases();

  if (releases === undefined) return <ReleaseNavSkeleton />;

  return (
    <ul className="space-y-0.5">
      {releases.map((release) => {
        const href = `/releases/${release.slug}`;
        const active = pathname === href;
        const rec = currentView(release, latest?.[release._id]).evaluation
          .recommendation;
        return (
          <li key={release._id}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] leading-5 text-rail-muted transition-colors hover:bg-rail-raised hover:text-rail-foreground",
                active && "bg-rail-raised text-rail-foreground",
              )}
            >
              <span className="flex size-4 items-center justify-center rounded-sm bg-sheet">
                <RecommendationIcon
                  value={rec}
                  className={cn("size-3", recTextTone[rec])}
                />
              </span>
              <span className="truncate">{release.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type NavLinkProps = {
  href: string;
  icon: typeof Settings;
  children: React.ReactNode;
};

function NavLink(props: NavLinkProps) {
  return (
    <Suspense fallback={<NavLinkView {...props} active={false} />}>
      <ActiveNavLink {...props} />
    </Suspense>
  );
}

function ActiveNavLink(props: NavLinkProps) {
  const pathname = usePathname();
  return <NavLinkView {...props} active={pathname === props.href} />;
}

function NavLinkView({
  href,
  icon: Icon,
  children,
  active,
}: NavLinkProps & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium text-rail-muted transition-colors hover:text-rail-foreground",
        active && "text-rail-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="rail-active"
          className="absolute inset-0 rounded-md bg-rail-raised"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
          aria-hidden
        />
      )}
      <Icon className="relative size-4" aria-hidden />
      <span className="relative">{children}</span>
    </Link>
  );
}

/** AI status as one quiet chip: a live dot, the provider and the model. */
function KeyStatus() {
  const { hasKey, model, provider, loading } = useAiKey();
  const reduce = useReducedMotion();
  if (loading) return <div className="mx-3 h-8 rounded-md bg-rail-raised/40" aria-hidden />;
  return (
    <Link
      href="/settings"
      title={hasKey ? `AI on: ${model}` : "Add an AI key in Settings to import data and run AI reviews"}
      className="group mx-3 flex items-center gap-2.5 rounded-md border border-rail-raised/80 px-3 py-1.5 text-xs text-rail-muted transition-colors hover:border-rail-muted/40 hover:text-rail-foreground"
    >
      <span className="relative flex size-2 shrink-0" aria-hidden>
        {hasKey && !reduce && (
          <motion.span
            className="absolute inset-0 rounded-full bg-go"
            animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <span className={cn("relative size-2 rounded-full", hasKey ? "bg-go" : "bg-cond")} />
      </span>
      {hasKey ? (
        <span className="min-w-0 truncate">
          <span className="text-rail-foreground">{provider === "gemini" ? "Gemini" : "OpenAI"}</span>{" "}
          <span className="font-mono text-[11px]">{model.replace(/^gemini-/, "")}</span>
        </span>
      ) : (
        <span className="min-w-0 truncate">
          Demo mode <span className="text-rail-foreground underline decoration-rail-muted/50 underline-offset-2 group-hover:decoration-current">Add AI key</span>
        </span>
      )}
      <KeyRound className="ml-auto size-3.5 shrink-0 opacity-60" aria-hidden />
    </Link>
  );
}

function initials(name: string) {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

const menuItem =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] text-foreground/85 transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none";

/**
 * The signed-in person. One button opens a small menu with the account,
 * settings, legal links and the author credit, so the rail stays quiet.
 */
function Account({ compact = false }: { compact?: boolean }) {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return <div className={compact ? "size-7" : "h-11 rounded-md bg-rail-raised/40"} aria-hidden />;
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const name = user.fullName || email;
  const badge = (
    <span
      aria-hidden
      className="flex size-7 shrink-0 items-center justify-center rounded-md bg-pencil-soft text-[11px] font-semibold text-pencil"
    >
      {initials(name)}
    </span>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={compact ? `Account: ${name}` : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-md text-left transition-colors hover:bg-rail-raised",
          compact ? "p-0.5" : "w-full px-2 py-1.5",
          open && "bg-rail-raised",
        )}
      >
        {badge}
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-rail-foreground">{user.fullName || email.split("@")[0]}</span>
              <span className="block truncate text-[11px] text-rail-muted">{email}</span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-rail-muted" aria-hidden />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: compact ? -6 : 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: compact ? -4 : 4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 520, damping: 34 }}
            style={{ transformOrigin: compact ? "top right" : "bottom left" }}
            className={cn(
              "absolute z-50 w-64 rounded-lg border bg-sheet p-1.5 text-foreground shadow-[0_20px_44px_-18px_rgba(18,61,51,0.55)]",
              compact ? "top-full right-0 mt-2" : "bottom-full left-0 mb-2",
            )}
          >
            <div className="px-2.5 pt-1.5 pb-2">
              <p className="truncate text-[13px] font-medium">{user.fullName || "Signed in"}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <div className="border-t pt-1">
              <Link href="/settings" role="menuitem" onClick={() => setOpen(false)} className={menuItem}>
                <Settings className="size-4 text-muted-foreground" aria-hidden /> Settings and AI key
              </Link>
              <button type="button" role="menuitem" onClick={() => { setOpen(false); openUserProfile(); }} className={menuItem}>
                <UserRound className="size-4 text-muted-foreground" aria-hidden /> Manage account
              </button>
            </div>
            <div className="mt-1 border-t pt-1">
              <Link href="/privacy" role="menuitem" onClick={() => setOpen(false)} className={menuItem}>
                <Shield className="size-4 text-muted-foreground" aria-hidden /> Privacy
              </Link>
              <Link href="/terms" role="menuitem" onClick={() => setOpen(false)} className={menuItem}>
                <FileText className="size-4 text-muted-foreground" aria-hidden /> Terms
              </Link>
            </div>
            <div className="mt-1 border-t pt-1">
              <button type="button" role="menuitem" onClick={() => signOut({ redirectUrl: "/" })} className={menuItem}>
                <LogOut className="size-4 text-muted-foreground" aria-hidden /> Sign out
              </button>
            </div>
            <p className="mt-1 border-t px-2.5 pt-2 pb-1 text-[11px] leading-4 text-muted-foreground">
              Built by Mayuri Saxena ·{" "}
              <a href="https://github.com/saxena28mayuri" target="_blank" rel="noreferrer" className="underline decoration-current/40 hover:text-foreground">GitHub</a>{" "}
              ·{" "}
              <a href="https://www.linkedin.com/in/saxena-mayuri/" target="_blank" rel="noreferrer" className="underline decoration-current/40 hover:text-foreground">LinkedIn</a>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// usePathname and useParams read request data, so with Cache Components
// every part that uses them streams in behind its own Suspense boundary.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellFrame
      nav={
        <div className="space-y-0.5">
          <NavLink href="/releases" icon={LayoutList}>
            All releases
          </NavLink>
          <NavLink href="/releases/new" icon={Plus}>
            New release
          </NavLink>
          <NavLink href="/settings" icon={Settings}>
            Settings
          </NavLink>
        </div>
      }
      releases={
        <Suspense fallback={<ReleaseNavSkeleton />}>
          <ReleaseNav />
        </Suspense>
      }
    >
      <Suspense>{children}</Suspense>
    </ShellFrame>
  );
}

function ShellFrame({
  nav,
  releases,
  children,
}: {
  nav: React.ReactNode;
  releases: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="hidden w-64 shrink-0 flex-col bg-rail lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div className="px-6 pt-5 pb-6">
          <Wordmark />
        </div>
        <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col gap-6 px-3">
          {nav}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <h2 className="px-3 pb-2 text-xs font-medium text-rail-muted/80">
              Releases
            </h2>
            {releases}
          </div>
        </nav>
        <div className="space-y-2 border-t border-rail-raised/70 pt-3 pb-4">
          <KeyStatus />
          <div className="px-3">
            <Account />
          </div>
        </div>
      </aside>

      <header className="flex items-center justify-between gap-4 bg-rail px-4 py-3 lg:hidden">
        <Wordmark />
        <nav aria-label="Main" className="flex items-center gap-1">
          <NavLink href="/releases" icon={LayoutList}>
            Releases
          </NavLink>
          <Account compact />
        </nav>
      </header>

      <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
        <main className="flex-1 bg-background lg:rounded-2xl lg:border lg:bg-sheet">{children}</main>
      </div>
    </div>
  );
}
