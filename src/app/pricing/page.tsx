"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { Check, X, Zap, Crown, Sparkles } from "lucide-react";
import Link from "next/link";

type BillingInterval = "monthly" | "annual";

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const { tier, isTrialing, trialAvailable, startFreeTrial, startCheckout, isLoading, isGuest } = useSubscription();

  const monthlyPrice = 4.99;
  const annualPrice = 49.99;
  const annualMonthly = (annualPrice / 12).toFixed(2);
  const savings = Math.round(((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100);

  const handleUpgrade = async (interval: BillingInterval) => {
    // If trial is available, try direct trial first (works without Stripe)
    if (trialAvailable) {
      const result = await startFreeTrial();
      if (result.success) {
        window.location.reload();
        return;
      }
    }
    // Fall back to Stripe checkout
    const url = await startCheckout(interval, trialAvailable);
    if (url) {
      window.location.href = url;
    }
  };

  const isPremium = tier === "premium";
  const showTrialCTA = !isGuest && tier === "free" && trialAvailable && !isTrialing;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start free, upgrade when you need more. No hidden fees.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === "monthly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("annual")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === "annual"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Annual
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Save {savings}%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 relative">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Free</h2>
              <p className="text-gray-600">Perfect for casual collectors</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">$0</span>
              <span className="text-gray-600">/month</span>
            </div>

            {isGuest ? (
              <Link
                href="/sign-up"
                className="block w-full py-3 px-4 text-center bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Create Free Account
              </Link>
            ) : tier === "free" && !isTrialing ? (
              <div className="py-3 px-4 text-center bg-gray-100 text-gray-600 rounded-lg font-medium">
                Current Plan
              </div>
            ) : (
              <div className="py-3 px-4 text-center bg-gray-50 text-gray-400 rounded-lg font-medium">
                Free Tier
              </div>
            )}

            <ul className="mt-8 space-y-4">
              <FeatureItem included>10 scans per month</FeatureItem>
              <FeatureItem included>Cloud collection sync</FeatureItem>
              <FeatureItem included>Real eBay prices</FeatureItem>
              <FeatureItem included>Public profile sharing</FeatureItem>
              <FeatureItem included>Buy & bid in Shop</FeatureItem>
              <FeatureItem included>3 active listings</FeatureItem>
              <FeatureItem included>8% seller fee</FeatureItem>
              <FeatureItem included>CSV import</FeatureItem>
              <FeatureItem>Key Hunt (offline lookup)</FeatureItem>
              <FeatureItem>CSV export</FeatureItem>
              <FeatureItem>Advanced statistics</FeatureItem>
              <FeatureItem>Unlimited listings</FeatureItem>
            </ul>
          </div>

          {/* Premium Tier */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 relative text-white">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full uppercase">
                Most Popular
              </span>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-6 h-6 text-yellow-400" />
                <h2 className="text-2xl font-bold">Premium</h2>
              </div>
              <p className="text-indigo-200">For serious collectors</p>
            </div>

            <div className="mb-6">
              {billingInterval === "monthly" ? (
                <>
                  <span className="text-4xl font-bold">${monthlyPrice}</span>
                  <span className="text-indigo-200">/month</span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold">${annualPrice}</span>
                  <span className="text-indigo-200">/year</span>
                  <div className="text-sm text-indigo-200 mt-1">
                    ${annualMonthly}/month billed annually
                  </div>
                </>
              )}
            </div>

            {isPremium ? (
              <div className="py-3 px-4 text-center bg-white/20 text-white rounded-lg font-medium">
                <Check className="w-5 h-5 inline mr-2" />
                Current Plan
              </div>
            ) : isTrialing ? (
              <button
                onClick={() => handleUpgrade(billingInterval)}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-white text-indigo-600 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Subscribe Now
              </button>
            ) : showTrialCTA ? (
              <button
                onClick={() => handleUpgrade(billingInterval)}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-white text-indigo-600 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Start 7-Day Free Trial
              </button>
            ) : (
              <button
                onClick={() => handleUpgrade(billingInterval)}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-white text-indigo-600 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {isGuest ? "Sign Up & Subscribe" : "Upgrade to Premium"}
              </button>
            )}

            <ul className="mt-8 space-y-4">
              <FeatureItem included premium>
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Unlimited scans
                </span>
              </FeatureItem>
              <FeatureItem included premium>Cloud collection sync</FeatureItem>
              <FeatureItem included premium>Real eBay prices</FeatureItem>
              <FeatureItem included premium>Public profile sharing</FeatureItem>
              <FeatureItem included premium>Buy & bid in Shop</FeatureItem>
              <FeatureItem included premium>
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Unlimited listings
                </span>
              </FeatureItem>
              <FeatureItem included premium>
                <span className="font-semibold">5% seller fee</span>
                <span className="text-indigo-200 text-sm ml-1">(save 3%)</span>
              </FeatureItem>
              <FeatureItem included premium>CSV import & export</FeatureItem>
              <FeatureItem included premium>
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Key Hunt (offline lookup)
                </span>
              </FeatureItem>
              <FeatureItem included premium>
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Advanced statistics
                </span>
              </FeatureItem>
            </ul>
          </div>
        </div>

        {/* Scan Pack Callout */}
        <div className="mt-12 max-w-2xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">
              Need more scans without subscribing?
            </h3>
            <p className="text-amber-700 mb-4">
              Purchase scan packs for $1.99 (10 scans). Great for occasional use.
            </p>
            {!isGuest && tier === "free" && (
              <button
                onClick={async () => {
                  const url = await startCheckout("scan_pack");
                  if (url) window.location.href = url;
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
              >
                Buy Scan Pack - $1.99
              </button>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <FAQ
              question="What happens when my trial ends?"
              answer="After your 7-day trial, you'll be charged for the plan you selected. You can cancel anytime before the trial ends to avoid charges. Any comics you scanned during the trial stay in your collection."
            />
            <FAQ
              question="Can I cancel anytime?"
              answer="Yes! You can cancel your subscription at any time. You'll keep Premium access until the end of your billing period, then revert to the Free tier."
            />
            <FAQ
              question="What's Key Hunt?"
              answer="Key Hunt is a quick price lookup mode designed for conventions. It caches barcode data for offline use, so you can quickly check prices without internet access."
            />
            <FAQ
              question="How does the seller fee work?"
              answer="When you sell a comic in the Shop, we charge a transaction fee. Free users pay 8%, Premium users pay 5%. This fee is deducted from the sale price."
            />
            <FAQ
              question="Do purchased scans expire?"
              answer="No! Scan packs never expire. Monthly scan limits reset on the 1st of each month, but purchased scans carry over."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  children,
  included = false,
  premium = false,
}: {
  children: React.ReactNode;
  included?: boolean;
  premium?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      {included ? (
        <Check className={`w-5 h-5 flex-shrink-0 ${premium ? "text-green-400" : "text-green-600"}`} />
      ) : (
        <X className="w-5 h-5 text-gray-300 flex-shrink-0" />
      )}
      <span className={included ? "" : "text-gray-400"}>{children}</span>
    </li>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-2">{question}</h3>
      <p className="text-gray-600">{answer}</p>
    </div>
  );
}
