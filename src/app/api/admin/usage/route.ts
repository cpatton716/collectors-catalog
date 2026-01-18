import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";

// Admin user IDs
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId);
}

// Service limits (free tier thresholds)
const LIMITS = {
  supabase: {
    database: 500 * 1024 * 1024, // 500MB in bytes
    storage: 1024 * 1024 * 1024, // 1GB in bytes
  },
  upstash: {
    commandsPerDay: 10000,
  },
  clerk: {
    mau: 10000,
  },
  resend: {
    emailsPerMonth: 3000,
  },
  anthropic: {
    // No hard limit, but track spend
    warningThreshold: 5, // $5 remaining
  },
};

// Alert thresholds (percentage of limit)
const ALERT_THRESHOLDS = {
  warning: 0.7, // 70%
  critical: 0.9, // 90%
};

interface UsageMetric {
  name: string;
  current: number;
  limit: number;
  unit: string;
  percentage: number;
  status: "ok" | "warning" | "critical";
  dashboard?: string;
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const metrics: UsageMetric[] = [];
    const errors: string[] = [];

    // 1. Supabase Database Size
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Get database size using pg_database_size
      const { data: sizeData, error: sizeError } = await supabase.rpc(
        "get_database_size"
      );

      if (!sizeError && sizeData !== null) {
        const dbSizeBytes = sizeData;
        const percentage = dbSizeBytes / LIMITS.supabase.database;
        metrics.push({
          name: "Supabase Database",
          current: dbSizeBytes,
          limit: LIMITS.supabase.database,
          unit: "bytes",
          percentage,
          status:
            percentage >= ALERT_THRESHOLDS.critical
              ? "critical"
              : percentage >= ALERT_THRESHOLDS.warning
                ? "warning"
                : "ok",
          dashboard: "https://supabase.com/dashboard",
        });
      } else {
        // Fallback: estimate from table counts
        const { count: comicsCount } = await supabase
          .from("comics")
          .select("*", { count: "exact", head: true });

        const { count: auctionsCount } = await supabase
          .from("auction_listings")
          .select("*", { count: "exact", head: true });

        // Rough estimate: ~5KB per comic with base64 image
        const estimatedSize = (comicsCount || 0) * 5000 + (auctionsCount || 0) * 1000;
        const percentage = estimatedSize / LIMITS.supabase.database;

        metrics.push({
          name: "Supabase Database (estimated)",
          current: estimatedSize,
          limit: LIMITS.supabase.database,
          unit: "bytes",
          percentage,
          status:
            percentage >= ALERT_THRESHOLDS.critical
              ? "critical"
              : percentage >= ALERT_THRESHOLDS.warning
                ? "warning"
                : "ok",
          dashboard: "https://supabase.com/dashboard",
        });
      }

      // Get row counts for context
      const { count: comicsCount } = await supabase
        .from("comics")
        .select("*", { count: "exact", head: true });

      const { count: profilesCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      metrics.push({
        name: "Total Comics in DB",
        current: comicsCount || 0,
        limit: 100000, // Arbitrary high limit for context
        unit: "rows",
        percentage: 0,
        status: "ok",
      });

      metrics.push({
        name: "Total User Profiles",
        current: profilesCount || 0,
        limit: LIMITS.clerk.mau,
        unit: "users",
        percentage: (profilesCount || 0) / LIMITS.clerk.mau,
        status:
          (profilesCount || 0) / LIMITS.clerk.mau >= ALERT_THRESHOLDS.critical
            ? "critical"
            : (profilesCount || 0) / LIMITS.clerk.mau >= ALERT_THRESHOLDS.warning
              ? "warning"
              : "ok",
      });
    } catch (e) {
      errors.push(`Supabase: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    // 2. Upstash Redis Usage
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });

      // Get info about the Redis instance
      // Note: Upstash doesn't expose daily command count via API
      // We'll track our own usage with a daily counter
      const today = new Date().toISOString().split("T")[0];
      const dailyKey = `usage:commands:${today}`;
      const commandCount = (await redis.get<number>(dailyKey)) || 0;

      // Increment for this request
      await redis.incr(dailyKey);
      await redis.expire(dailyKey, 86400 * 2); // Keep for 2 days

      const percentage = commandCount / LIMITS.upstash.commandsPerDay;
      metrics.push({
        name: "Upstash Redis (today)",
        current: commandCount,
        limit: LIMITS.upstash.commandsPerDay,
        unit: "commands",
        percentage,
        status:
          percentage >= ALERT_THRESHOLDS.critical
            ? "critical"
            : percentage >= ALERT_THRESHOLDS.warning
              ? "warning"
              : "ok",
        dashboard: "https://console.upstash.com",
      });
    } catch (e) {
      errors.push(`Upstash: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    // 3. Scan counts (Anthropic API usage proxy)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Get scans from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: recentScans } = await supabase
        .from("comics")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString());

      // ~$0.015 per scan
      const estimatedCost = (recentScans || 0) * 0.015;

      metrics.push({
        name: "Scans (last 30 days)",
        current: recentScans || 0,
        limit: 1000, // Arbitrary threshold
        unit: "scans",
        percentage: 0,
        status: "ok",
      });

      metrics.push({
        name: "Estimated API Cost (30 days)",
        current: estimatedCost,
        limit: 10, // $10 budget
        unit: "USD",
        percentage: estimatedCost / 10,
        status:
          estimatedCost >= 9
            ? "critical"
            : estimatedCost >= 7
              ? "warning"
              : "ok",
        dashboard: "https://console.anthropic.com",
      });
    } catch (e) {
      errors.push(`Scan metrics: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    // Calculate overall status
    const criticalCount = metrics.filter((m) => m.status === "critical").length;
    const warningCount = metrics.filter((m) => m.status === "warning").length;
    const overallStatus =
      criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "ok";

    return NextResponse.json({
      metrics,
      errors: errors.length > 0 ? errors : undefined,
      overallStatus,
      thresholds: ALERT_THRESHOLDS,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching usage metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage metrics" },
      { status: 500 }
    );
  }
}
