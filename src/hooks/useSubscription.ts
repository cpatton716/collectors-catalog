"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

export type SubscriptionTier = "guest" | "free" | "premium";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export interface SubscriptionState {
  // Loading state
  isLoading: boolean;
  error: string | null;

  // User type
  isGuest: boolean;
  tier: SubscriptionTier;
  status: SubscriptionStatus | null;

  // Scan tracking
  scansUsed: number;
  scansRemaining: number;
  monthlyLimit: number | null; // null = unlimited
  canScan: boolean;
  purchasedScans: number;
  monthResetDate: Date | null;

  // Trial info
  isTrialing: boolean;
  trialAvailable: boolean;
  trialEndsAt: Date | null;
  trialDaysRemaining: number;

  // Subscription info
  currentPeriodEnd: Date | null;

  // Listing limits
  listingLimit: number;
  activeListings: number;
  canCreateListing: boolean;

  // Feature access
  features: {
    keyHunt: boolean;
    csvExport: boolean;
    fullStats: boolean;
    unlimitedListings: boolean;
    unlimitedScans: boolean;
    shopBuying: boolean;
    cloudSync: boolean;
  };

  // Actions
  refresh: () => Promise<void>;
  startCheckout: (priceType: "monthly" | "annual" | "scan_pack", withTrial?: boolean) => Promise<string | null>;
  openBillingPortal: () => Promise<string | null>;
}

const defaultFeatures = {
  keyHunt: false,
  csvExport: false,
  fullStats: false,
  unlimitedListings: false,
  unlimitedScans: false,
  shopBuying: false,
  cloudSync: false,
};

export function useSubscription(): SubscriptionState {
  const { isSignedIn, isLoaded } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Omit<SubscriptionState, "isLoading" | "error" | "refresh" | "startCheckout" | "openBillingPortal"> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/status");
      if (!response.ok) {
        throw new Error("Failed to fetch subscription status");
      }

      const result = await response.json();

      setData({
        isGuest: result.isGuest,
        tier: result.tier,
        status: result.status,
        scansUsed: result.scansUsed,
        scansRemaining: result.scansRemaining,
        monthlyLimit: result.monthlyLimit,
        canScan: result.canScan,
        purchasedScans: result.purchasedScans,
        monthResetDate: result.monthResetDate ? new Date(result.monthResetDate) : null,
        isTrialing: result.isTrialing,
        trialAvailable: result.trialAvailable,
        trialEndsAt: result.trialEndsAt ? new Date(result.trialEndsAt) : null,
        trialDaysRemaining: result.trialDaysRemaining,
        currentPeriodEnd: result.currentPeriodEnd ? new Date(result.currentPeriodEnd) : null,
        listingLimit: result.listingLimit,
        activeListings: result.activeListings,
        canCreateListing: result.canCreateListing,
        features: result.features || defaultFeatures,
      });
    } catch (err) {
      console.error("Error fetching subscription status:", err);
      setError(err instanceof Error ? err.message : "Unknown error");

      // Set default guest state on error
      setData({
        isGuest: !isSignedIn,
        tier: isSignedIn ? "free" : "guest",
        status: null,
        scansUsed: 0,
        scansRemaining: isSignedIn ? 10 : 5,
        monthlyLimit: isSignedIn ? 10 : 5,
        canScan: true,
        purchasedScans: 0,
        monthResetDate: null,
        isTrialing: false,
        trialAvailable: isSignedIn || false,
        trialEndsAt: null,
        trialDaysRemaining: 0,
        currentPeriodEnd: null,
        listingLimit: isSignedIn ? 3 : 0,
        activeListings: 0,
        canCreateListing: isSignedIn || false,
        features: {
          ...defaultFeatures,
          shopBuying: isSignedIn || false,
          cloudSync: isSignedIn || false,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  // Initial fetch and refetch on auth change
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const startCheckout = useCallback(
    async (priceType: "monthly" | "annual" | "scan_pack", withTrial = false): Promise<string | null> => {
      try {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceType, withTrial }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create checkout session");
        }

        const { url } = await response.json();
        return url;
      } catch (err) {
        console.error("Checkout error:", err);
        setError(err instanceof Error ? err.message : "Checkout failed");
        return null;
      }
    },
    []
  );

  const openBillingPortal = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to open billing portal");
      }

      const { url } = await response.json();
      return url;
    } catch (err) {
      console.error("Billing portal error:", err);
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
      return null;
    }
  }, []);

  // Return default state while loading or if no data
  if (!data) {
    return {
      isLoading: true,
      error: null,
      isGuest: !isSignedIn,
      tier: isSignedIn ? "free" : "guest",
      status: null,
      scansUsed: 0,
      scansRemaining: isSignedIn ? 10 : 5,
      monthlyLimit: isSignedIn ? 10 : 5,
      canScan: true,
      purchasedScans: 0,
      monthResetDate: null,
      isTrialing: false,
      trialAvailable: false,
      trialEndsAt: null,
      trialDaysRemaining: 0,
      currentPeriodEnd: null,
      listingLimit: isSignedIn ? 3 : 0,
      activeListings: 0,
      canCreateListing: isSignedIn || false,
      features: defaultFeatures,
      refresh: fetchStatus,
      startCheckout,
      openBillingPortal,
    };
  }

  return {
    isLoading,
    error,
    ...data,
    refresh: fetchStatus,
    startCheckout,
    openBillingPortal,
  };
}

/**
 * Helper hook for feature-specific checks
 */
export function useFeatureAccess(feature: keyof SubscriptionState["features"]): {
  hasAccess: boolean;
  isLoading: boolean;
  tier: SubscriptionTier;
} {
  const { features, tier, isLoading } = useSubscription();

  return {
    hasAccess: features[feature],
    isLoading,
    tier,
  };
}

/**
 * Helper hook for scan limit display
 */
export function useScanLimits(): {
  used: number;
  remaining: number;
  limit: number | null;
  isUnlimited: boolean;
  resetDate: Date | null;
  canScan: boolean;
  isLoading: boolean;
} {
  const { scansUsed, scansRemaining, monthlyLimit, monthResetDate, canScan, isLoading } = useSubscription();

  return {
    used: scansUsed,
    remaining: scansRemaining,
    limit: monthlyLimit,
    isUnlimited: monthlyLimit === null,
    resetDate: monthResetDate,
    canScan,
    isLoading,
  };
}
