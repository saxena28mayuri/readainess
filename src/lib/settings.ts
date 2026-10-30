"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { providerInfo, type Provider } from "@/lib/ai/provider";

/**
 * The signed-in user's AI key status from the server. The key itself is
 * stored encrypted in Convex and never reaches the browser.
 */
export function useAiKey() {
  const { isAuthenticated } = useConvexAuth();
  const status = useQuery(api.ai.keyStatus, isAuthenticated ? {} : "skip");
  const provider: Provider = status?.provider ?? "gemini";
  return {
    status,
    loading: status === undefined,
    hasKey: !!status,
    provider,
    providerName: providerInfo[provider].label,
    model: status?.model ?? providerInfo[provider].defaultModel,
  };
}

/** Message text from a Convex error, without the server's stack prefix. */
export function errorText(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "data" in err && typeof (err as { data: unknown }).data === "string") {
    return (err as { data: string }).data;
  }
  if (err instanceof Error) {
    return err.message.split("\n")[0].replace(/^.*Uncaught (ConvexError|Error): /, "").replace(/^\[.*?\]\s*/, "") || fallback;
  }
  return fallback;
}
