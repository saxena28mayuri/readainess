import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { sha256Hex } from "./apiTokens";
import { parsePushBody } from "../src/lib/readiness/merge";

// Push API for CI and scripts:
//   GET  /api/signals?release=<slug>   what the release accepts
//   POST /api/signals?release=<slug>   send values
// Both need "Authorization: Bearer rdy_..." from Settings.

const MAX_BODY = 200_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function authenticate(request: Request) {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!/^rdy_[0-9a-f]{48}$/.test(token)) return null;
  return sha256Hex(token);
}

const http = httpRouter();

http.route({
  path: "/api/signals",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const hash = await authenticate(request);
    if (!hash) return json({ error: "Send a valid token as 'Authorization: Bearer rdy_...'." }, 401);
    const slug = new URL(request.url).searchParams.get("release");
    if (!slug) return json({ error: "Add ?release=<slug> to the URL." }, 400);
    const out = await ctx.runQuery(internal.apiTokens.targetsFor, { hash, slug });
    return out.ok ? json({ release: out.name, accepts: out.accepts }) : json({ error: out.error }, out.status);
  }),
});

http.route({
  path: "/api/signals",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const hash = await authenticate(request);
    if (!hash) return json({ error: "Send a valid token as 'Authorization: Bearer rdy_...'." }, 401);
    const slug = new URL(request.url).searchParams.get("release");
    if (!slug) return json({ error: "Add ?release=<slug> to the URL." }, 400);

    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: "Body is limited to 200 KB." }, 413);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: "The body is not valid JSON." }, 400);
    }
    const parsed = parsePushBody(body);
    if ("error" in parsed) return json({ error: parsed.error }, 400);

    try {
      const out = await ctx.runMutation(internal.apiTokens.applyPush, { hash, slug, signals: parsed.signals, source: parsed.source });
      if (out.ok) return json({ ok: true, applied: out.applied });
      return json({ error: out.error, accepts: out.accepts }, out.status);
    } catch (err) {
      const message = err instanceof Error ? err.message.split("\n")[0].replace(/^.*Uncaught Error: /, "") : "Could not apply the values.";
      return json({ error: message }, 400);
    }
  }),
});

export default http;
