"use client";

import { useEffect } from "react";
import { X, Zap, Crown, Check, Target, Download, BarChart3, ShoppingBag } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

type UpgradeReason =
  | "scan_limit"
  | "listing_limit"
  | "key_hunt"
  | "csv_export"
  | "full_stats"
  | "general";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: UpgradeReason;
  scansUsed?: number;
  monthResetDate?: Date | null;
}

const reasonContent: Record<UpgradeReason, { title: string; description: string; icon: React.ReactNode }> = {
  scan_limit: {
    title: "You've used all your scans",
    description: "Upgrade to Premium for unlimited scanning",
    icon: <Zap className="w-8 h-8 text-amber-500" />,
  },
  listing_limit: {
    title: "Listing limit reached",
    description: "Free accounts can have up to 3 active listings",
    icon: <ShoppingBag className="w-8 h-8 text-amber-500" />,
  },
  key_hunt: {
    title: "Key Hunt is Premium only",
    description: "Quick price lookups at conventions with offline support",
    icon: <Target className="w-8 h-8 text-indigo-500" />,
  },
  csv_export: {
    title: "CSV Export is Premium only",
    description: "Export your collection for backup or analysis",
    icon: <Download className="w-8 h-8 text-indigo-500" />,
  },
  full_stats: {
    title: "Advanced Statistics are Premium only",
    description: "Get detailed insights and trends for your collection",
    icon: <BarChart3 className="w-8 h-8 text-indigo-500" />,
  },
  general: {
    title: "Upgrade to Premium",
    description: "Unlock all features for serious collectors",
    icon: <Crown className="w-8 h-8 text-amber-500" />,
  },
};

const premiumFeatures = [
  "Unlimited scans",
  "Key Hunt (offline lookups)",
  "CSV export",
  "Advanced statistics",
  "Unlimited listings",
  "5% seller fee (vs 8%)",
];

export function UpgradeModal({
  isOpen,
  onClose,
  reason = "general",
  scansUsed,
  monthResetDate,
}: UpgradeModalProps) {
  const { tier, trialAvailable, isTrialing, startCheckout, isLoading } = useSubscription();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = reasonContent[reason];
  const showTrialButton = tier === "free" && trialAvailable && !isTrialing;

  const handleStartTrial = async () => {
    const url = await startCheckout("monthly", true);
    if (url) {
      window.location.href = url;
    }
  };

  const handleBuyScanPack = async () => {
    const url = await startCheckout("scan_pack");
    if (url) {
      window.location.href = url;
    }
  };

  const formatResetDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl transform transition-all">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-600 to-purple-600 px-6 py-8 text-white rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="mb-4 p-3 bg-white/20 rounded-full">
              {content.icon}
            </div>
            <h2 className="text-xl font-bold mb-2">
              {content.title}
            </h2>
            <p className="text-indigo-200">
              {content.description}
            </p>

            {reason === "scan_limit" && scansUsed !== undefined && (
              <div className="mt-4 bg-white/10 rounded-lg px-4 py-2 text-sm">
                <span className="font-medium">{scansUsed} / 10</span> scans used
                {monthResetDate && (
                  <span className="text-indigo-200 ml-1">
                    &bull; Resets {formatResetDate(monthResetDate)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Premium features */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Premium includes
            </h3>
            <ul className="space-y-2">
              {premiumFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            {showTrialButton ? (
              <button
                onClick={handleStartTrial}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Start 7-Day Free Trial
              </button>
            ) : (
              <a
                href="/pricing"
                className="block w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-center"
              >
                View Premium Plans
              </a>
            )}

            {reason === "scan_limit" && tier === "free" && (
              <button
                onClick={handleBuyScanPack}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Buy 10 Scans - $1.99
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              Maybe later
            </button>
          </div>

          {/* Price note */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Premium starts at $4.99/month &bull; Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
