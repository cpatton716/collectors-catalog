"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Cloud, Sparkles, AlertTriangle, Infinity, Shield, Smartphone } from "lucide-react";
import type { MilestoneType } from "@/hooks/useGuestScans";

// Non-null milestone type for the modal (modal should only be shown with a valid milestone)
type ValidMilestone = Exclude<MilestoneType, null>;

interface SignUpPromptModalProps {
  milestone: ValidMilestone;
  scanCount: number;
  onClose: () => void;
}

const milestoneContent: Record<ValidMilestone, {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  benefits: { icon: React.ElementType; text: string }[];
  ctaText: string;
  dismissText: string;
}> = {
  halfway: {
    title: "You're on a roll!",
    subtitle: "You've scanned 5 comics. Create a free account to unlock even more features.",
    icon: Sparkles,
    iconBg: "bg-primary-100",
    iconColor: "text-primary-600",
    benefits: [
      { icon: Cloud, text: "Sync your collection across all devices" },
      { icon: Infinity, text: "Unlimited comic scans" },
      { icon: Shield, text: "Never lose your collection data" },
    ],
    ctaText: "Create Free Account",
    dismissText: "Maybe later",
  },
  almostDone: {
    title: "Only 1 free scan left!",
    subtitle: "Don't lose your progress. Sign up now to keep scanning and save your collection forever.",
    icon: AlertTriangle,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    benefits: [
      { icon: Infinity, text: "Unlimited scanning after sign up" },
      { icon: Cloud, text: "Your collection saved to the cloud" },
      { icon: Smartphone, text: "Access from any device" },
    ],
    ctaText: "Sign Up Now",
    dismissText: "Use my last scan",
  },
  limitReached: {
    title: "You've used all free scans",
    subtitle: "Create a free account to continue scanning and unlock all features.",
    icon: AlertTriangle,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    benefits: [
      { icon: Infinity, text: "Unlimited comic scanning" },
      { icon: Cloud, text: "Cloud-synced collection" },
      { icon: Shield, text: "Your data is always safe" },
    ],
    ctaText: "Create Free Account",
    dismissText: "Close",
  },
};

export function SignUpPromptModal({ milestone, scanCount, onClose }: SignUpPromptModalProps) {
  const content = milestoneContent[milestone];
  const Icon = content.icon;

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="pt-8 pb-6 px-6 text-center">
          <div className={`w-16 h-16 ${content.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`w-8 h-8 ${content.iconColor}`} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
          <p className="text-gray-600 mt-2">{content.subtitle}</p>

          {/* Scan count badge */}
          <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 bg-gray-100 rounded-full">
            <span className="text-sm text-gray-600">
              {scanCount} of 10 free scans used
            </span>
          </div>
        </div>

        {/* Benefits */}
        <div className="px-6 pb-6">
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            {content.benefits.map((benefit, index) => {
              const BenefitIcon = benefit.icon;
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <BenefitIcon className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="text-sm text-gray-700">{benefit.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-8 space-y-3">
          <Link
            href="/sign-up"
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            {content.ctaText}
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              {content.dismissText}
            </button>
            <Link
              href="/sign-in"
              className="flex-1 py-3 text-center text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              Already have an account?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
