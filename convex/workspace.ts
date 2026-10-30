import type { Auth } from "convex/server";

export interface Workspace {
  /** "org:<id>" when a team is active, otherwise "user:<id>". */
  id: string;
  userId: string;
  orgId?: string;
}

/**
 * The workspace a request acts in, taken from the verified Clerk session:
 * the active organization when there is one, otherwise the user alone.
 * Never accepted from the client.
 */
export async function getWorkspace(ctx: { auth: Auth }): Promise<Workspace | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  // Session token v2 carries the active org as {"o": {"id": ...}}; v1 as org_id.
  const o = identity.o as { id?: string } | undefined;
  const orgId = o?.id ?? (identity.org_id as string | undefined);
  return orgId
    ? { id: `org:${orgId}`, userId: identity.subject, orgId }
    : { id: `user:${identity.subject}`, userId: identity.subject };
}

export async function requireWorkspace(ctx: { auth: Auth }): Promise<Workspace> {
  const workspace = await getWorkspace(ctx);
  if (!workspace) throw new Error("Sign in to continue");
  return workspace;
}
