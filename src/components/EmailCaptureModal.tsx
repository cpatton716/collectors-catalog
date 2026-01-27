"use client";

import { useState } from "react";

import Link from "next/link";

import { Gift, Loader2, Mail, Sparkles, X } from "lucide-react";

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  scansUsed: number;
}

/**
 * EmailCaptureModal - Offers bonus scans in exchange for verified email
 *
 * Shown when guests hit their 5 scan limit. Sends a verification email
 * and grants 5 bonus scans when the user clicks the link.
 */
export function EmailCaptureModal({
  isOpen,
  onClose,
  onSuccess,
  scansUsed,
}: EmailCaptureModalProps) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Hidden field to catch bots
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailSent, setIsEmailSent] = useState(false);

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
          honeypot, // Will be empty for real users, filled by bots
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError(
            data.error ||
              "This email has already been used for bonus scans. Sign up for a free account to get 10 scans/month!"
          );
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
        return;
      }

      // Show "check your email" message
      setIsEmailSent(true);

      // Note: We don't call onSuccess() here anymore - bonus scans are granted
      // when the user clicks the verification link and returns to the scan page
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // If email was sent, call onSuccess to close the modal properly
    if (isEmailSent) {
      onSuccess();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl transform transition-all overflow-hidden">
        {/* Email Sent State */}
        {isEmailSent ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email!</h2>
            <p className="text-gray-600 mb-4">
              We sent a verification link to <strong>{email}</strong>. Click the link to unlock your
              5 bonus scans.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
            </p>
            <button
              onClick={handleClose}
              className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Got it
            </button>
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
                <h2 className="text-xl font-bold mb-2">Want 5 More Scans?</h2>
                <p className="text-amber-100">
                  You&apos;ve used all {scansUsed} guest scans. Enter your email to unlock 5 bonus
                  scans!
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
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Honeypot field - hidden from real users, filled by bots */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                style={{
                  position: "absolute",
                  left: "-9999px",
                  opacity: 0,
                  height: 0,
                  width: 0,
                }}
                aria-hidden="true"
              />

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
                    Sending...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Send Verification Email
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                We&apos;ll send you a link to verify your email and unlock bonus scans.
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
