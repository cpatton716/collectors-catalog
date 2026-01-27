import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define routes that require authentication
const isProtectedRoute = createRouteMatcher([
  // Admin routes require authentication
  "/admin(.*)",
  "/api/admin(.*)",
  // Billing routes require authentication
  "/api/billing(.*)",
  // User-specific routes
  "/api/watchlist(.*)",
  "/api/notifications(.*)",
  "/api/sharing(.*)",
  "/api/key-hunt(.*)",
  // Auction actions that require a user
  "/api/auctions/:id/bid(.*)",
  "/api/auctions/:id/buy-now(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
