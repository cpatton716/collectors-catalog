"use client";

import { useState } from "react";
import {
  X,
  DollarSign,
  Gavel,
  Tag,
  Calendar,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Check,
  Package,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { CollectionItem } from "@/types/comic";
import {
  MIN_FIXED_PRICE,
  MIN_STARTING_PRICE,
  AUCTION_DURATION_OPTIONS,
} from "@/types/auction";

type ListingMode = "sell" | "auction";

interface ListInShopModalProps {
  comic: CollectionItem;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (listingId: string) => void;
}

export function ListInShopModal({
  comic,
  isOpen,
  onClose,
  onCreated,
}: ListInShopModalProps) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<ListingMode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sell form state
  const [price, setPrice] = useState<string>("");
  const [acceptsOffers, setAcceptsOffers] = useState(false);
  const [minOfferAmount, setMinOfferAmount] = useState<string>("");

  // Auction form state
  const [startingBid, setStartingBid] = useState<string>("");
  const [buyItNowPrice, setBuyItNowPrice] = useState<string>("");
  const [scheduledStart, setScheduledStart] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [durationDays, setDurationDays] = useState<number>(7);

  // Shared state
  const [shippingCost, setShippingCost] = useState<string>("5");
  const [description, setDescription] = useState<string>("");

  const resetForm = () => {
    setStep(1);
    setMode(null);
    setPrice("");
    setAcceptsOffers(false);
    setMinOfferAmount("");
    setStartingBid("");
    setBuyItNowPrice("");
    setScheduledStart(false);
    setStartDate("");
    setDurationDays(7);
    setShippingCost("5");
    setDescription("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectMode = (selectedMode: ListingMode) => {
    setMode(selectedMode);
    setStep(2);
    setError(null);
  };

  const validateSellForm = (): boolean => {
    const listingPrice = parseFloat(price);
    if (isNaN(listingPrice) || listingPrice < MIN_FIXED_PRICE) {
      setError(`Price must be at least $${MIN_FIXED_PRICE}`);
      return false;
    }

    if (acceptsOffers) {
      const minOffer = parseFloat(minOfferAmount);
      if (isNaN(minOffer) || minOffer < MIN_FIXED_PRICE) {
        setError(`Minimum offer must be at least $${MIN_FIXED_PRICE}`);
        return false;
      }
      if (minOffer >= listingPrice) {
        setError("Minimum offer must be less than the asking price");
        return false;
      }
    }

    const shipping = parseFloat(shippingCost);
    if (isNaN(shipping) || shipping < 0) {
      setError("Please enter a valid shipping cost");
      return false;
    }

    setError(null);
    return true;
  };

  const validateAuctionForm = (): boolean => {
    const starting = parseFloat(startingBid);
    if (isNaN(starting) || starting < MIN_STARTING_PRICE) {
      setError(`Starting bid must be at least $${MIN_STARTING_PRICE}`);
      return false;
    }

    if (buyItNowPrice) {
      const buyNow = parseFloat(buyItNowPrice);
      if (isNaN(buyNow) || buyNow <= starting) {
        setError("Buy It Now price must be higher than starting bid");
        return false;
      }
    }

    if (scheduledStart) {
      const selectedDate = new Date(startDate);
      const now = new Date();
      if (selectedDate <= now) {
        setError("Start date must be in the future");
        return false;
      }
    }

    if (durationDays < 1 || durationDays > 14) {
      setError("Auction duration must be between 1 and 14 days");
      return false;
    }

    const shipping = parseFloat(shippingCost);
    if (isNaN(shipping) || shipping < 0) {
      setError("Please enter a valid shipping cost");
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (mode === "sell" && !validateSellForm()) return;
    if (mode === "auction" && !validateAuctionForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      const body =
        mode === "sell"
          ? {
              comicId: comic.id,
              listingType: "fixed_price",
              price: parseFloat(price),
              shippingCost: parseFloat(shippingCost),
              description,
              acceptsOffers,
              minOfferAmount: acceptsOffers
                ? parseFloat(minOfferAmount)
                : undefined,
            }
          : {
              comicId: comic.id,
              listingType: "auction",
              startingPrice: parseFloat(startingBid),
              buyItNowPrice: buyItNowPrice
                ? parseFloat(buyItNowPrice)
                : undefined,
              durationDays,
              shippingCost: parseFloat(shippingCost),
              description,
              startDate: scheduledStart ? startDate : undefined,
            };

      const response = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        onCreated?.(data.auction.id);
        handleClose();
      } else {
        setError(data.error || "Failed to create listing");
      }
    } catch {
      setError("Failed to create listing. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Get min date for date picker (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  // Get max date (14 days from now for start date)
  const maxStartDate = new Date();
  maxStartDate.setDate(maxStartDate.getDate() + 14);
  const maxDate = maxStartDate.toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => {
                  setStep(step - 1);
                  setError(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold">
              {step === 1
                ? "List in Shop"
                : mode === "sell"
                ? "Sell Your Comic"
                : "Create Auction"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Choose Mode */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <img
                  src={comic.coverImageUrl || "/placeholder-cover.png"}
                  alt={comic.comic.title || "Comic"}
                  className="w-16 h-20 object-cover rounded"
                />
                <div>
                  <p className="font-medium">{comic.comic.title}</p>
                  <p className="text-sm text-gray-600">
                    #{comic.comic.issueNumber}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                How would you like to sell this comic?
              </p>

              <button
                onClick={() => selectMode("sell")}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Tag className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Sell (Fixed Price)</p>
                    <p className="text-sm text-gray-500">
                      Set a price, sell instantly
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => selectMode("auction")}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Gavel className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Auction</p>
                    <p className="text-sm text-gray-500">
                      Let buyers bid, max 14 days
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          )}

          {/* Step 2: Sell Form */}
          {step === 2 && mode === "sell" && (
            <div className="space-y-4">
              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asking Price *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    min={MIN_FIXED_PRICE}
                    step="0.01"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Listing valid for 30 days
                </p>
              </div>

              {/* Accept Offers Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Accept Offers</p>
                  <p className="text-xs text-gray-500">
                    Allow buyers to make offers
                  </p>
                </div>
                <button
                  onClick={() => setAcceptsOffers(!acceptsOffers)}
                  className="text-green-600"
                >
                  {acceptsOffers ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Min Offer Amount (if accepting offers) */}
              {acceptsOffers && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lowest Offer Accepted *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={minOfferAmount}
                      onChange={(e) => setMinOfferAmount(e.target.value)}
                      placeholder="0.00"
                      min={MIN_FIXED_PRICE}
                      step="0.01"
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Offers below this will be auto-rejected
                  </p>
                </div>
              )}

              {/* Shipping */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping Cost
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Condition notes, defects, etc."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 2: Auction Form */}
          {step === 2 && mode === "auction" && (
            <div className="space-y-4">
              {/* Starting Bid */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Starting Bid *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={startingBid}
                    onChange={(e) => setStartingBid(e.target.value)}
                    placeholder="0.99"
                    min={MIN_STARTING_PRICE}
                    step="0.01"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Buy It Now Price (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buy It Now Price (optional)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={buyItNowPrice}
                    onChange={(e) => setBuyItNowPrice(e.target.value)}
                    placeholder="0.00"
                    min={MIN_STARTING_PRICE}
                    step="0.01"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Disabled once bidding exceeds this price
                </p>
              </div>

              {/* Schedule Start Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Schedule Start</p>
                  <p className="text-xs text-gray-500">
                    Start auction at a future time
                  </p>
                </div>
                <button
                  onClick={() => setScheduledStart(!scheduledStart)}
                  className="text-blue-600"
                >
                  {scheduledStart ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Start Date (if scheduled) */}
              {scheduledStart && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={minDate}
                      max={maxDate}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Will show as "Coming Soon" until start
                  </p>
                </div>
              )}

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auction Duration *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  >
                    {AUCTION_DURATION_OPTIONS.filter((opt) => opt.value <= 14).map(
                      (option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">Maximum 14 days</p>
              </div>

              {/* Shipping */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping Cost
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Condition notes, defects, etc."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 mt-4 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="p-4 border-t bg-gray-50">
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${
                mode === "sell"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-blue-600 hover:bg-blue-700"
              } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  {mode === "sell" ? "List for Sale" : "Create Auction"}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
