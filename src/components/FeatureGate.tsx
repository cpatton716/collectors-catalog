"use client";

import { ReactNode } from "react";
import { useSubscription, SubscriptionTier } from "@/hooks/useSubscription";
import { Lock, Zap, TrendingUp, Target, Download, BarChart3 } from "lucide-react";

type FeatureKey = "keyHunt" | "csvExport" | "fullStats" | "unlimitedListings" | "unlimitedScans" | "shopBuying" | "cloudSync";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

// Feature metadata for upgrade prompts
const featureInfo: Record<FeatureKey, { name: string; description: string; icon: ReactNode }> = {
  keyHunt: {
    name: "Key Hunt",
    description: "Quick price lookups at conventions with offline barcode caching",
    icon: <Target className="w-5 h-5" />,
  },
  csvExport: {
    name: "CSV Export",
    description: "Export your collection to CSV for backup or analysis",
    icon: <Download className="w-5 h-5" />,
  },
  fullStats: {
    name: "Full Statistics",
    description: "Detailed insights, trends, and value analysis for your collection",
    icon: <BarChart3 className="w-5 h-5" />,
  },
  unlimitedListings: {
    name: "Unlimited Listings",
    description: "List as many comics as you want in the Shop",
    icon: <TrendingUp className="w-5 h-5" />,
  },
  unlimitedScans: {
    name: "Unlimited Scans",
    description: "Scan as many comics as you want each month",
    icon: <Zap className="w-5 h-5" />,
  },
  shopBuying: {
    name: "Shop Access",
    description: "Buy and bid on comics in the marketplace",
    icon: <TrendingUp className="w-5 h-5" />,
  },
  cloudSync: {
    name: "Cloud Sync",
    description: "Sync your collection across all your devices",
    icon: <Zap className="w-5 h-5" />,
  },
};

/**
 * FeatureGate component - wraps content that requires a specific subscription tier
 *
 * Usage:
 * <FeatureGate feature="keyHunt">
 *   <KeyHuntContent />
 * </FeatureGate>
 *
 * Or with custom fallback:
 * <FeatureGate feature="csvExport" fallback={<ExportDisabled />}>
 *   <ExportButton />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const { features, isLoading, tier, isTrialing, startCheckout } = useSubscription();

  // Show loading state
  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg h-20" />
    );
  }

  // Check access
  const hasAccess = features[feature];

  if (hasAccess) {
    return <>{children}</>;
  }

  // Use custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  if (!showUpgradePrompt) {
    return null;
  }

  const info = featureInfo[feature];

  const handleUpgradeClick = async () => {
    // If free tier, start trial; otherwise go to pricing
    const url = await startCheckout("monthly", tier === "free" && !isTrialing);
    if (url) {
      window.location.href = url;
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-4">
        <Lock className="w-6 h-6 text-indigo-600" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {info.name} is a Premium Feature
      </h3>

      <p className="text-gray-600 mb-4 max-w-sm mx-auto">
        {info.description}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {tier === "free" && !isTrialing && (
          <button
            onClick={handleUpgradeClick}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Start 7-Day Free Trial
          </button>
        )}
        <a
          href="/pricing"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          View Pricing
        </a>
      </div>
    </div>
  );
}

/**
 * Inline feature badge for buttons/links that are gated
 * Shows a lock icon and "Premium" badge
 */
export function PremiumBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full ${className}`}>
      <Lock className="w-3 h-3" />
      Premium
    </span>
  );
}

/**
 * Hook to check if user can access a feature
 */
export function useCanAccessFeature(feature: FeatureKey): boolean {
  const { features, isLoading } = useSubscription();
  if (isLoading) return false;
  return features[feature];
}

/**
 * FeatureButton - A button that's disabled for non-premium users
 */
interface FeatureButtonProps {
  feature: FeatureKey;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function FeatureButton({
  feature,
  onClick,
  children,
  className = "",
  disabled = false,
}: FeatureButtonProps) {
  const { features, isLoading, tier, isTrialing, startCheckout } = useSubscription();
  const hasAccess = features[feature];

  const handleClick = async () => {
    if (hasAccess) {
      onClick();
    } else {
      // Redirect to upgrade
      const url = await startCheckout("monthly", tier === "free" && !isTrialing);
      if (url) {
        window.location.href = url;
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`relative ${className} ${!hasAccess ? "opacity-75" : ""}`}
    >
      {children}
      {!hasAccess && (
        <span className="absolute -top-1 -right-1">
          <PremiumBadge />
        </span>
      )}
    </button>
  );
}

/**
 * RequiresTier - Shows content only if user has at least the specified tier
 */
interface RequiresTierProps {
  tier: SubscriptionTier;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequiresTier({ tier: requiredTier, children, fallback }: RequiresTierProps) {
  const { tier, isGuest, isLoading } = useSubscription();

  if (isLoading) {
    return <div className="animate-pulse bg-gray-100 rounded h-8" />;
  }

  // Tier hierarchy: guest < free < premium
  const tierLevel = { guest: 0, free: 1, premium: 2 };
  const userLevel = isGuest ? 0 : tierLevel[tier] || 0;
  const requiredLevel = tierLevel[requiredTier] || 0;

  if (userLevel >= requiredLevel) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}
