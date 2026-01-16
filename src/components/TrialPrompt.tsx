"use client";

import { useState, useEffect } from "react";
import { X, Zap, Crown, Clock, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

interface TrialPromptProps {
  onDismiss?: () => void;
}

/**
 * TrialPrompt - Shows trial-related prompts at key milestones
 *
 * Shows:
 * - Day 3: "Enjoying Premium?" with subscription CTA
 * - Day 6: "Trial ends tomorrow" with urgency
 *
 * Only shows once per milestone (tracked in localStorage)
 */
export function TrialPrompt({ onDismiss }: TrialPromptProps) {
  const { isTrialing, trialDaysRemaining, trialEndsAt, startCheckout, isLoading } = useSubscription();
  const [dismissed, setDismissed] = useState(false);
  const [promptType, setPromptType] = useState<"day3" | "day6" | null>(null);

  useEffect(() => {
    if (!isTrialing) return;

    // Check localStorage for which prompts have been shown
    const shownPrompts = JSON.parse(localStorage.getItem("trial_prompts_shown") || "{}");

    // Day 6 prompt (1 day remaining) takes priority
    if (trialDaysRemaining <= 1 && !shownPrompts.day6) {
      setPromptType("day6");
    }
    // Day 3 prompt (4 days remaining means they're on day 3/4)
    else if (trialDaysRemaining <= 4 && trialDaysRemaining > 1 && !shownPrompts.day3) {
      setPromptType("day3");
    }
  }, [isTrialing, trialDaysRemaining]);

  const handleDismiss = () => {
    if (promptType) {
      // Mark this prompt as shown
      const shownPrompts = JSON.parse(localStorage.getItem("trial_prompts_shown") || "{}");
      shownPrompts[promptType] = true;
      localStorage.setItem("trial_prompts_shown", JSON.stringify(shownPrompts));
    }
    setDismissed(true);
    onDismiss?.();
  };

  const handleSubscribe = async () => {
    const url = await startCheckout("monthly", false);
    if (url) window.location.href = url;
  };

  // Don't show if not trialing, no prompt type, or dismissed
  if (!isTrialing || !promptType || dismissed) return null;

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  // Day 6 prompt - urgent
  if (promptType === "day6") {
    return (
      <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-96 z-50 animate-slide-up">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg p-4 text-white">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <Clock className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Trial Ends Tomorrow!</h3>
              <p className="text-white/90 text-sm mt-1">
                Your Premium trial ends {formatDate(trialEndsAt)}. Subscribe now to keep unlimited scans and all Premium features.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={handleSubscribe}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-lg font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  <Crown className="w-4 h-4" />
                  Subscribe Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-white/80 hover:text-white text-sm"
                >
                  Remind me later
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Day 3 prompt - positive check-in
  if (promptType === "day3") {
    return (
      <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-96 z-50 animate-slide-up">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-4 text-white">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Enjoying Premium?</h3>
              <p className="text-white/90 text-sm mt-1">
                You have {trialDaysRemaining} days left in your trial. Subscribe now to lock in unlimited scans and never worry about limits again.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={handleSubscribe}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  Subscribe - $4.99/mo
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-white/80 hover:text-white text-sm"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * TrialStatusBadge - Small badge showing trial status
 * Can be used in headers, profile sections, etc.
 */
export function TrialStatusBadge() {
  const { isTrialing, trialDaysRemaining } = useSubscription();

  if (!isTrialing) return null;

  const getBadgeColor = () => {
    if (trialDaysRemaining <= 1) return "bg-amber-100 text-amber-700 border-amber-200";
    if (trialDaysRemaining <= 3) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-indigo-100 text-indigo-700 border-indigo-200";
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getBadgeColor()}`}>
      <Zap className="w-3 h-3" />
      Trial: {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} left
    </span>
  );
}
