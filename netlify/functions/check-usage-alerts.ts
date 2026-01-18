import type { Config, Context } from "@netlify/functions";

// Scheduled function to check usage alerts daily
// Runs at 9 AM UTC (4 AM EST / 1 AM PST)

export default async (req: Request, context: Context) => {
  const siteUrl = process.env.URL || "https://collectors-chest.com";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET not configured");
    return new Response("CRON_SECRET not configured", { status: 500 });
  }

  try {
    const response = await fetch(`${siteUrl}/api/admin/usage/check-alerts`, {
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const data = await response.json();

    console.log("Usage check completed:", data);

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error checking usage alerts:", error);
    return new Response(
      JSON.stringify({ error: "Failed to check usage alerts" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config: Config = {
  // Run daily at 9 AM UTC
  schedule: "@daily",
};
