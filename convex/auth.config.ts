import type { AuthConfig } from "convex/server";

// Clerk session tokens are verified directly against Clerk's public keys, so
// no JWT template is needed in the Clerk dashboard.
const issuer = process.env.CLERK_FRONTEND_API_URL!;

export default {
  providers: [
    {
      type: "customJwt",
      issuer,
      jwks: `${issuer}/.well-known/jwks.json`,
      algorithm: "RS256",
    },
  ],
} satisfies AuthConfig;
