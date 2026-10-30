"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;

// Created once per browser session. Without a URL the app still renders,
// so the UI can be worked on before Convex is connected.
const convex = url ? new ConvexReactClient(url) : null;

/**
 * Hands Convex the plain Clerk session token. Convex verifies it against
 * Clerk's public keys (convex/auth.config.ts), so no JWT template is needed.
 * orgId is a dependency so switching teams fetches a token for the new org.
 */
function useClerkSession() {
  const { isLoaded, isSignedIn, getToken, orgId } = useAuth();
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        return await getToken({ skipCache: forceRefreshToken });
      } catch {
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getToken, orgId],
  );
  return useMemo(
    () => ({ isLoading: !isLoaded, isAuthenticated: isSignedIn ?? false, fetchAccessToken }),
    [isLoaded, isSignedIn, fetchAccessToken],
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return <>{children}</>;
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useClerkSession}>
      {children}
    </ConvexProviderWithAuth>
  );
}
