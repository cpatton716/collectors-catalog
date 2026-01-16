"use client";

import { UserProfile } from "@clerk/nextjs";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Zap, CreditCard, ExternalLink, Check, Calendar } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const {
    tier,
    status,
    isTrialing,
    trialDaysRemaining,
    trialEndsAt,
    scansRemaining,
    scansUsed,
    monthResetDate,
    trialAvailable,
    startCheckout,
    openBillingPortal,
    isLoading,
    isGuest,
  } = useSubscription();

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const handleStartTrial = async () => {
    const url = await startCheckout("monthly", true);
    if (url) window.location.href = url;
  };

  const handleUpgrade = async () => {
    const url = await startCheckout("monthly", false);
    if (url) window.location.href = url;
  };

  return (
    <div className="max-w-3xl mx-auto py-4 px-4">
      {/* Clerk User Profile */}
      <UserProfile
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-sm",
          },
        }}
      />

      {/* Subscription & Billing Section */}
      {!isGuest && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-600" />
              Subscription & Billing
            </h2>
          </div>

          <div className="p-6">
            {/* Current Plan */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {tier === "premium" || isTrialing ? (
                    <Crown className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Zap className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-lg font-semibold text-gray-900">
                    {isTrialing ? "Premium (Trial)" : tier === "premium" ? "Premium" : "Free"}
                  </span>
                  {isTrialing && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                      {trialDaysRemaining} days left
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {tier === "premium"
                    ? "Unlimited scans, all features included"
                    : isTrialing
                    ? `Trial ends ${formatDate(trialEndsAt)}`
                    : "10 scans per month, basic features"}
                </p>
              </div>

              {tier === "premium" && !isTrialing ? (
                <button
                  onClick={openBillingPortal}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Manage Plan
                  <ExternalLink className="w-4 h-4" />
                </button>
              ) : isTrialing ? (
                <button
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <Crown className="w-4 h-4" />
                  Subscribe Now
                </button>
              ) : trialAvailable ? (
                <button
                  onClick={handleStartTrial}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  Start Free Trial
                </button>
              ) : (
                <Link
                  href="/pricing"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade
                </Link>
              )}
            </div>

            {/* Usage Stats (for free tier) */}
            {tier === "free" && !isTrialing && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Monthly Usage</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Scans used</span>
                      <span className="font-medium text-gray-900">{scansUsed} / 10</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          scansUsed >= 10 ? "bg-red-500" : scansUsed >= 7 ? "bg-amber-500" : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(100, (scansUsed / 10) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                {monthResetDate && (
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Resets {formatDate(monthResetDate)}
                  </p>
                )}
              </div>
            )}

            {/* Feature Comparison */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {tier === "premium" || isTrialing ? "Your Premium Features" : "Upgrade to Premium"}
              </h3>
              <ul className="space-y-2">
                {[
                  { feature: "Unlimited scans", included: tier === "premium" || isTrialing },
                  { feature: "Key Hunt (offline lookups)", included: tier === "premium" || isTrialing },
                  { feature: "CSV export", included: tier === "premium" || isTrialing },
                  { feature: "Advanced statistics", included: tier === "premium" || isTrialing },
                  { feature: "Unlimited listings", included: tier === "premium" || isTrialing },
                  { feature: "5% seller fee (vs 8%)", included: tier === "premium" || isTrialing },
                ].map((item) => (
                  <li key={item.feature} className="flex items-center gap-2 text-sm">
                    <Check
                      className={`w-4 h-4 ${
                        item.included ? "text-green-500" : "text-gray-300"
                      }`}
                    />
                    <span className={item.included ? "text-gray-900" : "text-gray-500"}>
                      {item.feature}
                    </span>
                  </li>
                ))}
              </ul>

              {tier === "free" && !isTrialing && (
                <Link
                  href="/pricing"
                  className="inline-block mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View all pricing details →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
