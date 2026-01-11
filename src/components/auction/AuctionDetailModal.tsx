"use client";

import { useState, useEffect } from "react";
import { X, Package, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Auction, formatPrice } from "@/types/auction";
import { AuctionCountdown } from "./AuctionCountdown";
import { BidForm } from "./BidForm";
import { BidHistory } from "./BidHistory";
import { SellerBadge } from "./SellerBadge";
import { WatchlistButton } from "./WatchlistButton";

interface AuctionDetailModalProps {
  auctionId: string;
  isOpen: boolean;
  onClose: () => void;
  onAuctionUpdated?: () => void;
}

export function AuctionDetailModal({
  auctionId,
  isOpen,
  onClose,
  onAuctionUpdated,
}: AuctionDetailModalProps) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (isOpen && auctionId) {
      loadAuction();
    }
  }, [isOpen, auctionId]);

  const loadAuction = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/auctions/${auctionId}`);
      if (response.ok) {
        const data = await response.json();
        setAuction(data.auction);
      }
    } catch (error) {
      console.error("Error loading auction:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBidPlaced = () => {
    loadAuction();
    onAuctionUpdated?.();
  };

  const handleBuyItNow = () => {
    loadAuction();
    onAuctionUpdated?.();
  };

  if (!isOpen) return null;

  // Get all images (cover + detail images)
  const allImages = auction
    ? [
        auction.comic?.coverImageUrl,
        ...(auction.detailImages || []),
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

          {isLoading || !auction ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-gray-600">Loading auction...</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row max-h-[90vh] overflow-auto">
              {/* Left: Image Gallery */}
              <div className="md:w-1/2 bg-gray-100 relative">
                {/* Main Image */}
                <div className="aspect-square relative">
                  {allImages[selectedImageIndex] ? (
                    <img
                      src={allImages[selectedImageIndex]}
                      alt="Auction item"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <span className="text-6xl text-green-400 font-bold italic">
                        ?
                      </span>
                    </div>
                  )}

                  {/* Navigation Arrows */}
                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {/* Watchlist Button */}
                  <div className="absolute top-4 right-4">
                    <WatchlistButton
                      auctionId={auction.id}
                      isWatching={auction.isWatching || false}
                    />
                  </div>
                </div>

                {/* Thumbnail Strip */}
                {hasMultipleImages && (
                  <div className="flex gap-2 p-4 overflow-x-auto">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                          idx === selectedImageIndex
                            ? "border-blue-500"
                            : "border-transparent"
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Details */}
              <div className="md:w-1/2 p-6 overflow-y-auto">
                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900">
                  {auction.comic?.comic?.title || "Unknown Title"} #
                  {auction.comic?.comic?.issueNumber || "?"}
                </h2>

                {auction.comic?.comic?.variant && (
                  <p className="text-gray-600 mt-1">
                    {auction.comic.comic.variant}
                  </p>
                )}

                {/* Publisher & Year */}
                <p className="text-sm text-gray-500 mt-2">
                  {auction.comic?.comic?.publisher || "Unknown Publisher"}
                  {auction.comic?.comic?.releaseYear &&
                    ` • ${auction.comic.comic.releaseYear}`}
                </p>

                {/* Countdown */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Time left:</span>
                    <AuctionCountdown endTime={auction.endTime} size="lg" />
                  </div>
                </div>

                {/* Seller */}
                {auction.seller && (
                  <div className="mt-4">
                    <span className="text-sm text-gray-600">Seller:</span>
                    <div className="mt-1">
                      <SellerBadge seller={auction.seller} />
                    </div>
                  </div>
                )}

                {/* Shipping */}
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                  <Package className="w-4 h-4" />
                  <span>
                    {auction.shippingCost > 0
                      ? `${formatPrice(auction.shippingCost)} shipping`
                      : "Free shipping"}
                  </span>
                </div>

                {/* End Date */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Ends{" "}
                    {new Date(auction.endTime).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Description */}
                {auction.description && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Description
                    </h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {auction.description}
                    </p>
                  </div>
                )}

                {/* Bid Form */}
                {auction.status === "active" && (
                  <div className="mt-6 pt-4 border-t">
                    <BidForm
                      auctionId={auction.id}
                      currentBid={auction.currentBid}
                      startingPrice={auction.startingPrice}
                      buyItNowPrice={auction.buyItNowPrice}
                      userMaxBid={auction.userBid?.maxBid}
                      isHighBidder={auction.userBid?.isWinning}
                      onBidPlaced={handleBidPlaced}
                      onBuyItNow={handleBuyItNow}
                    />
                  </div>
                )}

                {/* Bid History */}
                <div className="mt-6 pt-4 border-t">
                  <BidHistory auctionId={auction.id} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
