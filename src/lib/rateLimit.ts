import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Initialize Redis only when environment variables are present
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Rate limiters for different endpoint types
export const rateLimiters = {
  // AI endpoints - expensive, strict limits (5 per minute)
  analyze: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        analytics: true,
        prefix: "ratelimit:analyze",
      })
    : null,

  // General API - moderate limits (30 per minute)
  api: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        analytics: true,
        prefix: "ratelimit:api",
      })
    : null,

  // Bidding - prevent sniping bots (3 per minute)
  bidding: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "1 m"),
        analytics: true,
        prefix: "ratelimit:bidding",
      })
    : null,

  // Comic lookup - moderate limits (20 per minute)
  lookup: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 m"),
        analytics: true,
        prefix: "ratelimit:lookup",
      })
    : null,
};

// Response type for rate limit check
interface RateLimitResult {
  success: boolean;
  response?: NextResponse;
}

/**
 * Check if a request should be rate limited
 * @param limiter - The rate limiter to use
 * @param identifier - Unique identifier (userId, IP, etc.)
 * @returns Object with success flag and optional 429 response
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<RateLimitResult> {
  // If rate limiting is not configured, allow all requests
  if (!limiter) {
    return { success: true };
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
              "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          }
        ),
      };
    }

    return { success: true };
  } catch (error) {
    // If rate limiting fails, log and allow the request
    console.error("Rate limit check failed:", error);
    return { success: true };
  }
}

/**
 * Get identifier for rate limiting from request context
 * Prefers userId, falls back to IP, then "anonymous"
 */
export function getRateLimitIdentifier(
  userId: string | null | undefined,
  ip: string | null | undefined
): string {
  return userId || ip || "anonymous";
}
