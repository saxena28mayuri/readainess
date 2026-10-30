import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// The home page and legal pages are public; the product needs an account.
// This is the optimistic redirect only: Convex re-checks the session on every
// query and mutation.
const isApp = createRouteMatcher(["/releases(.*)", "/settings(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isApp(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
