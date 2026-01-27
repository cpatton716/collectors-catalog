"use client";

import { useState } from "react";

import Link from "next/link";

import { AlertCircle, Calendar, Gift, ShoppingCart, Sparkles, Zap } from "lucide-react";

import { useGuestScans } from "@/hooks/useGuestScans";
import { useSubscription } from "@/hooks/useSubscription";

import { EmailCaptureModal } from "./EmailCaptureModal";

interface ScanLimitBannerProps {
  variant?: "warning" | "info";
}

/**
 * ScanLimitBanner - Shows scan usage for both guests and registered users
 *
 * For guests: Shows remaining scans (out of 5) with sign-up prompt
 * For free users: Shows monthly scans with reset date, trial CTA, and buy scans option
 * For premium/trialing: Hidden (unlimited scans)
 */
export function ScanLimitBanner({ variant = "info" }: ScanLimitBannerProps) {
  const {
    remaining: guestRemaining,
    isGuest,
    isLimitReached: guestLimitReached,
    hasBonusScans,
    totalLimit,
    count: guestScanCount,
    addBonusScans,
  } = useGuestScans();
  const {
    tier,
    scansRemaining,
    scansUsed,
    monthResetDate,
    isTrialing,
    trialAvailable,
    canScan,
    startFreeTrial,
    startCheckout,
    isLoading,
  } = useSubscription();

  const [showEmailCapture, setShowEmailCapture] = useState(false);

  // Don't show for premium or trialing users (unlimited scans)
  if (tier === "premium" || isTrialing) return null;

  // Guest user handling
  // Handle email capture success
  const handleEmailCaptureSuccess = () => {
    addBonusScans();
    setShowEmailCapture(false);
  };

  if (isGuest) {
    if (guestLimitReached) {
      return (
        <>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Free Scan Limit Reached</h3>
                <p className="text-sm text-red-700 mt-1">
                  You&apos;ve used all {totalLimit} free guest scans.
                  {!hasBonusScans
                    ? " Get 5 bonus scans or create a free account for 10 scans per month!"
                    : " Create a free account to get 10 scans per month!"}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {!hasBonusScans && (
                    <button
                      onClick={() => setShowEmailCapture(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                    >
                      <Gift className="w-4 h-4" />
                      Get 5 Bonus Scans
                    </button>
                  )}
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                  >
                    <Sparkles className="w-4 h-4" />
                    Create Free Account
                  </Link>
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <EmailCaptureModal
            isOpen={showEmailCapture}
            onClose={() => setShowEmailCapture(false)}
            onSuccess={handleEmailCaptureSuccess}
            scansUsed={guestScanCount}
          />
        </>
      );
    }

    if (variant === "warning" && guestRemaining <= 2) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">
                {guestRemaining} Guest Scan{guestRemaining !== 1 ? "s" : ""} Remaining
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                Create a free account to get 10 scans per month, cloud sync, and more!
              </p>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 mt-2 text-sm font-medium text-amber-800 hover:text-amber-900"
              >
                <Sparkles className="w-4 h-4" />
                Sign Up Free →
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // Info variant for guests
    if (variant === "info") {
      return (
        <div className="bg-pop-yellow border-3 border-pop-black shadow-[4px_4px_0px_#000] p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-pop-black" />
              <span className="font-comic text-pop-black">
                {guestRemaining} free scan{guestRemaining !== 1 ? "s" : ""} remaining
              </span>
            </div>
            <Link
              href="/sign-up"
              className="font-comic text-pop-black hover:text-pop-blue transition-colors"
            >
              Join waitlist →
            </Link>
          </div>
        </div>
      );
    }

    return null;
  }

  // Registered free user handling
  const formatResetDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleBuyScans = async () => {
    const url = await startCheckout("scan_pack");
    if (url) window.location.href = url;
  };

  const handleStartTrial = async () => {
    const result = await startFreeTrial();
    if (result.success) {
      // Show success - the page will refresh with updated subscription state
      window.location.reload();
    } else {
      // If direct trial fails, try Stripe checkout as fallback
      const url = await startCheckout("monthly", true);
      if (url) window.location.href = url;
    }
  };

  // Free user - limit reached
  if (!canScan) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800">Monthly Scan Limit Reached</h3>
            <p className="text-sm text-red-700 mt-1">
              You&apos;ve used all 10 scans this month.
              {monthResetDate && (
                <span className="text-red-600"> Resets {formatResetDate(monthResetDate)}.</span>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {trialAvailable && (
                <button
                  onClick={handleStartTrial}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  Start 7-Day Free Trial
                </button>
              )}
              <button
                onClick={handleBuyScans}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy 10 Scans - $1.99
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Free user - warning when running low
  if (variant === "warning" && scansRemaining <= 3) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800">
              {scansRemaining} Scan{scansRemaining !== 1 ? "s" : ""} Remaining This Month
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {monthResetDate && <>Resets {formatResetDate(monthResetDate)}. </>}
              Get unlimited scans with Premium!
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {trialAvailable && (
                <button
                  onClick={handleStartTrial}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-800 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  Start Free Trial →
                </button>
              )}
              <button
                onClick={handleBuyScans}
                disabled={isLoading}
                className="inline-flex items-center gap-2 text-sm font-medium text-amber-800 hover:text-amber-900 disabled:opacity-50"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy Scans →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Free user - info variant with subtle usage display
  if (variant === "info") {
    const getCountColor = () => {
      if (scansRemaining >= 7) return "text-green-600 bg-green-100";
      if (scansRemaining >= 4) return "text-yellow-600 bg-yellow-100";
      return "text-red-600 bg-red-100";
    };

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold px-2.5 py-1 rounded ${getCountColor()}`}>
              {scansRemaining} scan{scansRemaining !== 1 ? "s" : ""} left
            </span>
            {monthResetDate && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Resets {formatResetDate(monthResetDate)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {trialAvailable && (
              <button
                onClick={handleStartTrial}
                disabled={isLoading}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                Go unlimited →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Keep old name as alias for backwards compatibility
export { ScanLimitBanner as GuestLimitBanner };
