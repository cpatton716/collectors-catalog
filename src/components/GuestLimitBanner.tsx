"use client";

import Link from "next/link";
import { AlertCircle, Sparkles } from "lucide-react";
import { useGuestScans } from "@/hooks/useGuestScans";

interface GuestLimitBannerProps {
  variant?: "warning" | "info";
}

export function GuestLimitBanner({ variant = "info" }: GuestLimitBannerProps) {
  const { remaining, isGuest, isLimitReached } = useGuestScans();

  // Don't show for signed-in users
  if (!isGuest) return null;

  if (isLimitReached) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800">Free Scan Limit Reached</h3>
            <p className="text-sm text-red-700 mt-1">
              You&apos;ve used all 10 free scans. Create a free account to unlock unlimited scanning
              and save your collection to the cloud.
            </p>
            <div className="mt-3 flex gap-3">
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
    );
  }

  if (variant === "warning" && remaining <= 3) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800">
              {remaining} Free Scan{remaining !== 1 ? "s" : ""} Remaining
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Create a free account to unlock unlimited scanning and sync your collection across
              devices.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 mt-2 text-sm font-medium text-amber-800 hover:text-amber-900"
            >
              <Sparkles className="w-4 h-4" />
              Create Free Account →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Info variant - subtle reminder with color-coded count
  if (variant === "info") {
    // Color coding: green (7-10), yellow (4-6), red (0-3)
    const getCountColor = () => {
      if (remaining >= 7) return "text-green-600 bg-green-100";
      if (remaining >= 4) return "text-yellow-600 bg-yellow-100";
      return "text-red-600 bg-red-100";
    };

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold px-2.5 py-1 rounded ${getCountColor()}`}>
            {remaining} free scan{remaining !== 1 ? "s" : ""} remaining
          </span>
          <Link
            href="/sign-up"
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Sign up for unlimited →
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
