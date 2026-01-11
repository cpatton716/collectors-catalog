"use client";

import { Auction, formatPrice } from "@/types/auction";
import { Tag, Package, ShoppingCart } from "lucide-react";
import { WatchlistButton } from "./WatchlistButton";
import { SellerBadgeCompact } from "./SellerBadge";

interface ListingCardProps {
  listing: Auction;
  onClick?: () => void;
  onWatchlistChange?: (listingId: string, isWatching: boolean) => void;
  showSeller?: boolean;
}

export function ListingCard({
  listing,
  onClick,
  onWatchlistChange,
  showSeller = true,
}: ListingCardProps) {
  const {
    id,
    startingPrice,
    shippingCost,
    comic,
    seller,
    isWatching,
  } = listing;

  const coverImageUrl = comic?.coverImageUrl;
  const title = comic?.comic?.title || "Unknown Title";
  const issueNumber = comic?.comic?.issueNumber || "?";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow"
    >
      {/* Cover Image */}
      <div className="relative aspect-[2/3] bg-gray-100">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={`${title} #${issueNumber}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900 text-4xl">
            <span className="text-green-400 font-bold italic drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]">
              ?
            </span>
          </div>
        )}

        {/* Watchlist Button */}
        <div className="absolute top-2 right-2">
          <WatchlistButton
            auctionId={id}
            isWatching={isWatching || false}
            onToggle={onWatchlistChange}
            size="sm"
          />
        </div>

        {/* Buy Now Badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
            <Tag className="w-3 h-3" />
            Buy Now
          </span>
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-2 right-2">
          <span className="px-2 py-1 bg-green-600 text-white text-sm font-bold rounded-lg">
            {formatPrice(startingPrice)}
          </span>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 pointer-events-none" />
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
        <p className="text-sm text-gray-600">
          #{issueNumber}
          {comic?.comic?.variant && (
            <span className="text-gray-400 ml-1">({comic.comic.variant})</span>
          )}
        </p>

        {/* Shipping Info */}
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
          <Package className="w-3 h-3" />
          {shippingCost > 0 ? `+${formatPrice(shippingCost)} shipping` : "Free shipping"}
        </div>

        {/* Buy Now Call to Action */}
        <div className="mt-2 flex items-center gap-1 text-xs text-green-600 font-medium">
          <ShoppingCart className="w-3 h-3" />
          <span>Buy Now</span>
        </div>

        {/* Seller Badge */}
        {showSeller && seller && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <SellerBadgeCompact seller={seller} />
          </div>
        )}
      </div>
    </div>
  );
}
