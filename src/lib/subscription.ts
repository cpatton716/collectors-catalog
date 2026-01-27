import { supabaseAdmin } from "./supabase";

// ============================================
// Types
// ============================================

export type SubscriptionTier = "free" | "premium";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isTrialing: boolean;
  trialEndsAt: Date | null;
  trialDaysRemaining: number;
  scansUsed: number;
  scansRemaining: number;
  purchasedScans: number;
  canScan: boolean;
  monthResetDate: Date;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
}

export interface ScanResult {
  success: boolean;
  remaining: number;
  message?: string;
}

// ============================================
// Constants
// ============================================

export const GUEST_SCAN_LIMIT = 5;
export const FREE_MONTHLY_SCAN_LIMIT = 10;
export const SCAN_PACK_AMOUNT = 10;

// ============================================
// Core Subscription Functions
// ============================================

/**
 * Get full subscription status for a user
 */
export async function getSubscriptionStatus(profileId: string): Promise<SubscriptionInfo | null> {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select(
      `
      subscription_tier,
      subscription_status,
      stripe_customer_id,
      stripe_subscription_id,
      subscription_current_period_end,
      trial_started_at,
      trial_ends_at,
      scans_used_this_month,
      scan_month_start,
      purchased_scans
    `
    )
    .eq("id", profileId)
    .single();

  if (error || !profile) return null;

  const now = new Date();
  const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const isTrialing = trialEndsAt !== null && trialEndsAt > now;
  const trialDaysRemaining = isTrialing
    ? Math.ceil((trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Check if we need to reset monthly scans
  const scanMonthStart = new Date(profile.scan_month_start);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let scansUsed = profile.scans_used_this_month || 0;

  // If scan_month_start is before current month, scans should be reset
  if (scanMonthStart < currentMonthStart) {
    scansUsed = 0;
    // Update the database (fire and forget)
    resetUserMonthlyScans(profileId).catch(console.error);
  }

  const tier = (profile.subscription_tier as SubscriptionTier) || "free";
  const isPremium = tier === "premium";
  const purchasedScans = profile.purchased_scans || 0;

  // Calculate remaining scans
  let scansRemaining: number;
  if (isPremium || isTrialing) {
    scansRemaining = 999999; // Unlimited
  } else {
    scansRemaining = Math.max(0, FREE_MONTHLY_SCAN_LIMIT - scansUsed) + purchasedScans;
  }

  const canScan = isPremium || isTrialing || scansRemaining > 0;

  // Calculate next reset date (1st of next month)
  const monthResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    tier,
    status: (profile.subscription_status as SubscriptionStatus) || "active",
    isTrialing,
    trialEndsAt,
    trialDaysRemaining,
    scansUsed,
    scansRemaining,
    purchasedScans,
    canScan,
    monthResetDate,
    stripeCustomerId: profile.stripe_customer_id,
    stripeSubscriptionId: profile.stripe_subscription_id,
    currentPeriodEnd: profile.subscription_current_period_end
      ? new Date(profile.subscription_current_period_end)
      : null,
  };
}

/**
 * Check if a user can perform a scan
 */
export async function canUserScan(profileId: string): Promise<boolean> {
  const status = await getSubscriptionStatus(profileId);
  return status?.canScan ?? false;
}

/**
 * Increment scan count for a user
 * Returns success status and remaining scans
 */
export async function incrementScanCount(
  profileId: string,
  source: "scan" | "import" | "key_hunt" = "scan"
): Promise<ScanResult> {
  const status = await getSubscriptionStatus(profileId);

  if (!status) {
    return { success: false, remaining: 0, message: "User not found" };
  }

  // Premium and trialing users have unlimited scans
  if (status.tier === "premium" || status.isTrialing) {
    // Still log the scan for analytics
    await logScanUsage(profileId, source);
    return { success: true, remaining: 999999 };
  }

  // Check if user can scan
  if (!status.canScan) {
    return {
      success: false,
      remaining: 0,
      message: "Scan limit reached. Upgrade to Premium or buy more scans.",
    };
  }

  // Determine whether to use monthly scans or purchased scans
  const monthlyRemaining = Math.max(0, FREE_MONTHLY_SCAN_LIMIT - status.scansUsed);

  if (monthlyRemaining > 0) {
    // Use monthly quota
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        scans_used_this_month: status.scansUsed + 1,
      })
      .eq("id", profileId);

    if (error) {
      console.error("Error incrementing scan count:", error);
      return { success: false, remaining: status.scansRemaining, message: "Database error" };
    }

    await logScanUsage(profileId, source);
    return { success: true, remaining: status.scansRemaining - 1 };
  } else if (status.purchasedScans > 0) {
    // Use purchased scans
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        purchased_scans: status.purchasedScans - 1,
      })
      .eq("id", profileId);

    if (error) {
      console.error("Error decrementing purchased scans:", error);
      return { success: false, remaining: status.scansRemaining, message: "Database error" };
    }

    await logScanUsage(profileId, source);
    return { success: true, remaining: status.scansRemaining - 1 };
  }

  return { success: false, remaining: 0, message: "No scans remaining" };
}

/**
 * Log scan usage for analytics
 */
async function logScanUsage(
  profileId: string,
  source: "scan" | "import" | "key_hunt"
): Promise<void> {
  const { error } = await supabaseAdmin.from("scan_usage").insert({
    user_id: profileId,
    source,
  });

  if (error) {
    console.error("Error logging scan usage:", error);
  }
}

/**
 * Reset monthly scan counts (called on first access of new month)
 */
async function resetUserMonthlyScans(profileId: string): Promise<void> {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  await supabaseAdmin
    .from("profiles")
    .update({
      scans_used_this_month: 0,
      scan_month_start: firstOfMonth.toISOString().split("T")[0],
    })
    .eq("id", profileId);
}

/**
 * Reset monthly scans for ALL free users (cron job)
 * Should be called on the 1st of each month
 */
export async function resetAllMonthlyScans(): Promise<{ updated: number }> {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({
      scans_used_this_month: 0,
      scan_month_start: firstOfMonth.toISOString().split("T")[0],
    })
    .eq("subscription_tier", "free")
    .lt("scan_month_start", firstOfMonth.toISOString().split("T")[0])
    .select("id");

  if (error) {
    console.error("Error resetting monthly scans:", error);
    return { updated: 0 };
  }

  return { updated: data?.length || 0 };
}

// ============================================
// Trial Functions
// ============================================

/**
 * Check if user has already used their trial
 */
export async function hasUsedTrial(profileId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("trial_started_at")
    .eq("id", profileId)
    .single();

  if (error || !data) return false;
  return data.trial_started_at !== null;
}

/**
 * Start a 7-day trial for a user
 */
export async function startTrial(
  profileId: string
): Promise<{ success: boolean; trialEndsAt?: Date; error?: string }> {
  // Check if trial already used
  const alreadyUsed = await hasUsedTrial(profileId);
  if (alreadyUsed) {
    return { success: false, error: "Trial already used" };
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      subscription_status: "trialing",
    })
    .eq("id", profileId);

  if (error) {
    console.error("Error starting trial:", error);
    return { success: false, error: "Database error" };
  }

  return { success: true, trialEndsAt };
}

/**
 * End trial (called when trial expires or user subscribes)
 */
export async function endTrial(profileId: string): Promise<void> {
  await supabaseAdmin
    .from("profiles")
    .update({
      trial_ends_at: null,
      subscription_status: "active",
    })
    .eq("id", profileId);
}

// ============================================
// Scan Pack Functions
// ============================================

/**
 * Add purchased scans to a user's account
 */
export async function addPurchasedScans(
  profileId: string,
  amount: number = SCAN_PACK_AMOUNT
): Promise<{ success: boolean; totalPurchased: number }> {
  // Get current purchased scans
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from("profiles")
    .select("purchased_scans")
    .eq("id", profileId)
    .single();

  if (fetchError || !profile) {
    return { success: false, totalPurchased: 0 };
  }

  const newTotal = (profile.purchased_scans || 0) + amount;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ purchased_scans: newTotal })
    .eq("id", profileId);

  if (error) {
    console.error("Error adding purchased scans:", error);
    return { success: false, totalPurchased: profile.purchased_scans || 0 };
  }

  return { success: true, totalPurchased: newTotal };
}

// ============================================
// Stripe Integration Functions
// ============================================

/**
 * Update user's Stripe customer ID
 */
export async function setStripeCustomerId(
  profileId: string,
  stripeCustomerId: string
): Promise<void> {
  await supabaseAdmin
    .from("profiles")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", profileId);
}

/**
 * Get profile by Stripe customer ID (for webhooks)
 */
export async function getProfileByStripeCustomerId(
  stripeCustomerId: string
): Promise<{ id: string; clerk_user_id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, clerk_user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Upgrade user to premium (called from webhook)
 */
export async function upgradeToPremium(
  profileId: string,
  stripeSubscriptionId: string,
  currentPeriodEnd: Date
): Promise<void> {
  await supabaseAdmin
    .from("profiles")
    .update({
      subscription_tier: "premium",
      subscription_status: "active",
      stripe_subscription_id: stripeSubscriptionId,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
      // Clear trial if active (they converted)
      trial_ends_at: null,
    })
    .eq("id", profileId);
}

/**
 * Downgrade user to free (called from webhook on cancellation)
 */
export async function downgradeToFree(profileId: string): Promise<void> {
  await supabaseAdmin
    .from("profiles")
    .update({
      subscription_tier: "free",
      subscription_status: "active",
      stripe_subscription_id: null,
      subscription_current_period_end: null,
    })
    .eq("id", profileId);
}

/**
 * Update subscription status (called from webhook)
 */
export async function updateSubscriptionStatus(
  profileId: string,
  status: SubscriptionStatus,
  currentPeriodEnd?: Date
): Promise<void> {
  const updates: Record<string, unknown> = {
    subscription_status: status,
  };

  if (currentPeriodEnd) {
    updates.subscription_current_period_end = currentPeriodEnd.toISOString();
  }

  await supabaseAdmin.from("profiles").update(updates).eq("id", profileId);
}

// ============================================
// Listing Limit Functions
// ============================================

/**
 * Check how many active listings a user has
 */
export async function getActiveListingCount(profileId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("auctions")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", profileId)
    .in("status", ["active", "pending"]);

  if (error) {
    console.error("Error counting listings:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Check if user can create a new listing
 */
export async function canCreateListing(
  profileId: string
): Promise<{ canCreate: boolean; currentCount: number; limit: number }> {
  const status = await getSubscriptionStatus(profileId);
  const currentCount = await getActiveListingCount(profileId);

  if (!status) {
    return { canCreate: false, currentCount: 0, limit: 0 };
  }

  // Premium users have unlimited listings
  if (status.tier === "premium" || status.isTrialing) {
    return { canCreate: true, currentCount, limit: 999999 };
  }

  // Free users limited to 3 listings
  const FREE_LISTING_LIMIT = 3;
  return {
    canCreate: currentCount < FREE_LISTING_LIMIT,
    currentCount,
    limit: FREE_LISTING_LIMIT,
  };
}

// ============================================
// Transaction Fee Functions
// ============================================

/**
 * Get transaction fee percentage for a user
 */
export async function getTransactionFeePercent(profileId: string): Promise<number> {
  const status = await getSubscriptionStatus(profileId);

  // Premium: 5%, Free: 8%
  if (status?.tier === "premium" || status?.isTrialing) {
    return 5;
  }
  return 8;
}

/**
 * Calculate platform fee for a sale
 */
export async function calculatePlatformFee(
  profileId: string,
  saleAmount: number
): Promise<{ feePercent: number; feeAmount: number; sellerReceives: number }> {
  const feePercent = await getTransactionFeePercent(profileId);
  const feeAmount = Math.round(saleAmount * (feePercent / 100) * 100) / 100;
  const sellerReceives = saleAmount - feeAmount;

  return { feePercent, feeAmount, sellerReceives };
}
