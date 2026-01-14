"use client";

import { useState } from "react";
import {
  X,
  DollarSign,
  AlertCircle,
  Check,
  XCircle,
  ArrowLeftRight,
} from "lucide-react";
import { Offer, formatPrice, MIN_FIXED_PRICE } from "@/types/auction";

interface OfferResponseModalProps {
  offer: Offer;
  askingPrice: number;
  isOpen: boolean;
  onClose: () => void;
  onResponse?: () => void;
}

export function OfferResponseModal({
  offer,
  askingPrice,
  isOpen,
  onClose,
  onResponse,
}: OfferResponseModalProps) {
  const [action, setAction] = useState<"accept" | "reject" | "counter" | null>(
    null
  );
  const [counterAmount, setCounterAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const maxRounds = 3;
  const roundsRemaining = maxRounds - offer.roundNumber;

  const handleSubmit = async () => {
    if (!action) return;

    if (action === "counter") {
      const amount = parseFloat(counterAmount);
      if (isNaN(amount) || amount < MIN_FIXED_PRICE) {
        setError(`Counter must be at least ${formatPrice(MIN_FIXED_PRICE)}`);
        return;
      }
      if (amount <= offer.amount) {
        setError("Counter must be higher than the current offer");
        return;
      }
      if (amount > askingPrice) {
        setError("Counter cannot exceed your asking price");
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          counterAmount: action === "counter" ? parseFloat(counterAmount) : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onResponse?.();
          onClose();
        }, 2000);
      } else {
        setError(data.error || "Failed to respond to offer");
      }
    } catch {
      setError("Failed to respond. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAction(null);
    setCounterAmount("");
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  const successMessages = {
    accept: "Offer accepted! The buyer will be notified to complete payment.",
    reject: "Offer declined. The buyer has been notified.",
    counter:
      "Counter-offer sent! You'll be notified when the buyer responds.",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Respond to Offer</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {success && action ? (
            <div className="text-center py-6">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  action === "accept"
                    ? "bg-green-100"
                    : action === "reject"
                    ? "bg-red-100"
                    : "bg-blue-100"
                }`}
              >
                {action === "accept" && (
                  <Check className="w-8 h-8 text-green-600" />
                )}
                {action === "reject" && (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
                {action === "counter" && (
                  <ArrowLeftRight className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <h3
                className={`text-lg font-semibold ${
                  action === "accept"
                    ? "text-green-700"
                    : action === "reject"
                    ? "text-red-700"
                    : "text-blue-700"
                }`}
              >
                {action === "accept" && "Offer Accepted!"}
                {action === "reject" && "Offer Declined"}
                {action === "counter" && "Counter-Offer Sent!"}
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                {successMessages[action]}
              </p>
            </div>
          ) : (
            <>
              {/* Offer Details */}
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Your Asking Price</span>
                  <span className="font-medium">{formatPrice(askingPrice)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Buyer's Offer</span>
                  <span className="font-semibold text-lg text-green-600">
                    {formatPrice(offer.amount)}
                  </span>
                </div>
                {offer.roundNumber > 1 && (
                  <p className="text-xs text-gray-500">
                    Negotiation round {offer.roundNumber} of {maxRounds}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              {!action && (
                <div className="space-y-2">
                  <button
                    onClick={() => setAction("accept")}
                    className="w-full flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Accept Offer</span>
                    </div>
                    <span className="text-green-600 font-semibold">
                      {formatPrice(offer.amount)}
                    </span>
                  </button>

                  {roundsRemaining > 0 && (
                    <button
                      onClick={() => setAction("counter")}
                      className="w-full flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                        <div className="text-left">
                          <span className="font-medium block">Counter-Offer</span>
                          <span className="text-xs text-gray-500">
                            {roundsRemaining} round{roundsRemaining !== 1 ? "s" : ""}{" "}
                            remaining
                          </span>
                        </div>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => setAction("reject")}
                    className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
                  >
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium">Decline Offer</span>
                  </button>
                </div>
              )}

              {/* Counter Amount Input */}
              {action === "counter" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Counter-Offer
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={counterAmount}
                      onChange={(e) => setCounterAmount(e.target.value)}
                      placeholder="Enter counter amount"
                      min={offer.amount + 1}
                      max={askingPrice}
                      step="0.01"
                      className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Must be between {formatPrice(offer.amount + 1)} and{" "}
                    {formatPrice(askingPrice)}
                  </p>
                </div>
              )}

              {/* Confirmation for accept/reject */}
              {(action === "accept" || action === "reject") && (
                <div
                  className={`p-3 rounded-lg ${
                    action === "accept" ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <p className="text-sm">
                    {action === "accept"
                      ? `Are you sure you want to accept ${formatPrice(offer.amount)}? This will complete the sale.`
                      : "Are you sure you want to decline this offer?"}
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && action && (
          <div className="p-4 border-t bg-gray-50 flex gap-2">
            <button
              onClick={() => {
                setAction(null);
                setCounterAmount("");
                setError(null);
              }}
              className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-100"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || (action === "counter" && !counterAmount)}
              className={`flex-1 py-3 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                action === "accept"
                  ? "bg-green-600 hover:bg-green-700"
                  : action === "reject"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {action === "accept" && "Accept"}
                  {action === "reject" && "Decline"}
                  {action === "counter" && "Send Counter"}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
