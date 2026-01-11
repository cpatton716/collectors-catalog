"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { X, Package, ChevronLeft, ChevronRight, ShoppingCart, AlertCircle, Check, Tag, Loader2 } from "lucide-react";
import { Auction, formatPrice } from "@/types/auction";
import { SellerBadge } from "./SellerBadge";
import { WatchlistButton } from "./WatchlistButton";

interface ListingDetailModalProps {
  listingId: string;
  isOpen: boolean;
  onClose: () => void;
  onListingUpdated?: () => void;
}

export function ListingDetailModal({
  listingId,
  isOpen,
  onClose,
  onListingUpdated,
}: ListingDetailModalProps) {
  const { isSignedIn } = useAuth();
  const [listing, setListing] = useState<Auction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (isOpen && listingId) {
      loadListing();
      setSelectedImageIndex(0);
      setPurchaseError(null);
      setPurchaseSuccess(false);
    }
  }, [isOpen, listingId]);

  const loadListing = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/auctions/${listingId}`);
      if (response.ok) {
        const data = await response.json();
        setListing(data.auction);
      }
    } catch (error) {
      console.error("Error loading listing:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!isSignedIn) {
      setPurchaseError("Please sign in to make a purchase");
      return;
    }

    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}/purchase`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setPurchaseSuccess(true);
        onListingUpdated?.();
      } else {
        setPurchaseError(data.error || "Failed to complete purchase");
      }
    } catch (error) {
      setPurchaseError("Failed to complete purchase. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!isOpen) return null;

  // Get all images (cover + detail images)
  const allImages = listing
    ? [
        listing.comic?.coverImageUrl,
        ...(listing.detailImages || []),
      ].filter(Boolean) as string[]
    : [];

  const hasMultipleImages = allImages.length > 1;

  const prevImage = () => {
    setSelectedImageIndex((prev) =>
      prev === 0 ? allImages.length - 1 : prev - 1
    );
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) =>
      prev === allImages.length - 1 ? 0 : prev + 1
    );
  };

  const comic = listing?.comic?.comic;
  const totalPrice = (listing?.startingPrice || 0) + (listing?.shippingCost || 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white/90 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : !listing ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-gray-500">Listing not found</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-0 max-h-[90vh] overflow-y-auto">
              {/* Left Column - Images */}
              <div className="relative bg-gray-900 aspect-[3/4] md:aspect-auto md:min-h-[500px]">
                {allImages.length > 0 ? (
                  <>
                    <img
                      src={allImages[selectedImageIndex]}
                      alt={comic?.title || "Comic"}
                      className="w-full h-full object-contain"
                    />

                    {/* Image Navigation */}
                    {hasMultipleImages && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>

                        {/* Image Dots */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {allImages.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedImageIndex(idx)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                idx === selectedImageIndex
                                  ? "bg-white"
                                  : "bg-white/50 hover:bg-white/75"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl text-green-400 font-bold italic">
                    ?
                  </div>
                )}

                {/* Watchlist Button */}
                <div className="absolute top-4 left-4">
                  <WatchlistButton
                    auctionId={listing.id}
                    isWatching={listing.isWatching || false}
                    onToggle={() => loadListing()}
                  />
                </div>
              </div>

              {/* Right Column - Details */}
              <div className="p-6 space-y-6">
                {/* Title */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Buy Now
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {comic?.title || "Unknown Title"} #{comic?.issueNumber || "?"}
                  </h2>
                  {comic?.variant && (
                    <p className="text-gray-500 mt-1">{comic.variant}</p>
                  )}
                  <p className="text-gray-600 mt-1">
                    {comic?.publisher || "Unknown Publisher"}
                    {comic?.releaseYear && ` (${comic.releaseYear})`}
                  </p>
                </div>

                {/* Seller */}
                {listing.seller && (
                  <div className="pt-4 border-t">
                    <SellerBadge seller={listing.seller} />
                  </div>
                )}

                {/* Price */}
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Price</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatPrice(listing.startingPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        Shipping
                      </span>
                      <span className="text-gray-700">
                        {listing.shippingCost > 0
                          ? formatPrice(listing.shippingCost)
                          : "Free"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-green-200">
                      <span className="font-medium text-gray-700">Total</span>
                      <span className="text-xl font-bold text-green-700">
                        {formatPrice(totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Purchase Button */}
                <div className="space-y-3">
                  {purchaseSuccess ? (
                    <div className="flex items-center justify-center gap-2 py-4 bg-green-100 text-green-700 rounded-xl">
                      <Check className="w-5 h-5" />
                      <span className="font-semibold">Purchase Complete!</span>
                    </div>
                  ) : listing.status === "active" ? (
                    <button
                      onClick={handlePurchase}
                      disabled={isPurchasing}
                      className="w-full py-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                    >
                      {isPurchasing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5" />
                          Buy Now for {formatPrice(totalPrice)}
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="py-4 bg-gray-100 text-gray-600 text-center rounded-xl">
                      This listing is no longer available
                    </div>
                  )}

                  {purchaseError && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {purchaseError}
                    </div>
                  )}

                  {!isSignedIn && listing.status === "active" && (
                    <p className="text-center text-sm text-gray-500">
                      <Link href="/sign-in" className="text-green-600 hover:underline">
                        Sign in
                      </Link>{" "}
                      to make a purchase
                    </p>
                  )}
                </div>

                {/* Description */}
                {listing.description && (
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Description
                    </h3>
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {listing.description}
                    </p>
                  </div>
                )}

                {/* Comic Details */}
                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    {comic?.writer && (
                      <>
                        <dt className="text-gray-500">Writer</dt>
                        <dd className="text-gray-900">{comic.writer}</dd>
                      </>
                    )}
                    {comic?.coverArtist && (
                      <>
                        <dt className="text-gray-500">Cover Artist</dt>
                        <dd className="text-gray-900">{comic.coverArtist}</dd>
                      </>
                    )}
                    {comic?.isSlabbed && (
                      <>
                        <dt className="text-gray-500">Graded</dt>
                        <dd className="text-gray-900">
                          {comic.gradingCompany} {comic.grade}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
