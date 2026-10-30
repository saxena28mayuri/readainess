import { AppShell } from "@/components/app-shell";

// The app loads its data in the browser behind sign-in (Clerk session →
// Convex), so a navigation here is allowed to block until the session is
// ready. This opts the signed-in routes out of instant-navigation validation,
// which pre-renders on the server without a session.
export const instant = false;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
