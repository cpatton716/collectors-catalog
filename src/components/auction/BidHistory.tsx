"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, User } from "lucide-react";
import { BidHistoryItem, formatPrice } from "@/types/auction";

interface BidHistoryProps {
  auctionId: string;
  initialBids?: BidHistoryItem[];
  maxVisible?: number;
}

export function BidHistory({
  auctionId,
  initialBids = [],
  maxVisible = 5,
}: BidHistoryProps) {
  const [bids, setBids] = useState<BidHistoryItem[]>(initialBids);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialBids.length);

  useEffect(() => {
    if (initialBids.length === 0) {
      loadBids();
    }
  }, [auctionId]);

  const loadBids = async () => {
    try {
      const response = await fetch(`/api/auctions/${auctionId}/bids`);
      if (response.ok) {
        const data = await response.json();
        setBids(data.bids || []);
      }
    } catch (error) {
      console.error("Error loading bid history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded" />
        ))}
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No bids yet. Be the first to bid!
      </div>
    );
  }

  const visibleBids = isExpanded ? bids : bids.slice(0, maxVisible);
  const hasMore = bids.length > maxVisible;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">
        Bid History ({bids.length} bid{bids.length !== 1 ? "s" : ""})
      </h4>

      <div className="divide-y divide-gray-100">
        {visibleBids.map((bid, index) => (
          <div
            key={`${bid.bidderNumber}-${bid.createdAt}`}
            className={`flex items-center justify-between py-2 ${
              index === 0 && bid.isWinning ? "bg-green-50 -mx-2 px-2 rounded" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Bidder {bid.bidderNumber}
                </span>
                {index === 0 && bid.isWinning && (
                  <span className="ml-2 text-xs text-green-600 font-medium">
                    High Bidder
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">
                {formatPrice(bid.bidAmount)}
              </div>
              <div className="text-xs text-gray-500">
                {formatDate(bid.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show all {bids.length} bids
            </>
          )}
        </button>
      )}
    </div>
  );
}
