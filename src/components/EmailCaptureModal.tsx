"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Gift, Mail, Loader2, Check, Sparkles } from "lucide-react";

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  scansUsed: number;
}

/**
 * EmailCaptureModal - Offers bonus scans in exchange for email
 *
 * Shown when guests hit their 5 scan limit. Offers 5 bonus scans
 * in exchange for their email address (no full signup required).
 */
export function EmailCaptureModal({
  isOpen,
  onClose,
  onSuccess,
  scansUsed,
}: EmailCaptureModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "bonus_scans",
          scansUsed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError("This email has already been used for bonus scans. Sign up for a free account to get 10 scans/month!");
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
        return;
      }

      // Success!
      setIsSuccess(true);

      // Wait a moment to show success state, then trigger callback
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl transform transition-all overflow-hidden">
        {/* Success State */}
        {isSuccess ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              You got 5 bonus scans!
            </h2>
            <p className="text-gray-600">
              Happy scanning! Check your email for tips on getting the most out of Collectors Chest.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 px-6 py-8 text-white">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="mb-4 p-3 bg-white/20 rounded-full">
                  <Gift className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">
                  Want 5 More Scans?
                </h2>
                <p className="text-amber-100">
                  You&apos;ve used all {scansUsed} guest scans. Enter your email to unlock 5 bonus scans instantly!
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full py-3 px-4 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Unlock 5 Bonus Scans
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                No spam, ever. We&apos;ll only send you tips and updates about Collectors Chest.
              </p>
            </form>

            {/* Alternative CTA */}
            <div className="px-6 pb-6 pt-0">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>
              <Link
                href="/sign-up"
                className="block mt-4 text-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Create a free account for 10 scans/month →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
