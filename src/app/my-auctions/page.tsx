"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Gavel,
  Tag,
  Trophy,
  Clock,
  Plus,
} from "lucide-react";
import { Auction, formatPrice } from "@/types/auction";
import { AuctionCard, AuctionDetailModal, ListingCard, ListingDetailModal } from "@/components/auction";

type ListingsTab = "active" | "ended";

export default function MyListingsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ListingsTab>("active");
  const [listings, setListings] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isSignedIn) {
      loadListings();
    }
  }, [isSignedIn]);

  const loadListings = async () => {
    setIsLoading(true);
    try {
      // Load all seller's listings (both auctions and fixed-price)
      const response = await fetch("/api/auctions?sellerId=me");
      if (response.ok) {
        const data = await response.json();
        setListings(data.auctions || []);
      }
    } catch (error) {
      console.error("Error loading listings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Separate by status
  const activeListings = listings.filter((l) => l.status === "active");
  const endedListings = listings.filter((l) => l.status !== "active");

  // Further separate active by type
  const activeAuctions = activeListings.filter((l) => l.listingType === "auction");
  const activeFixedPrice = activeListings.filter((l) => l.listingType === "fixed_price");

  const handleListingClick = (listing: Auction) => {
    if (listing.listingType === "auction") {
      setSelectedAuctionId(listing.id);
    } else {
      setSelectedListingId(listing.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
              <p className="text-gray-600 mt-1">
                Manage your auctions and items for sale
              </p>
            </div>
            <button
              onClick={() => router.push("/collection")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Listing</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="container mx-auto px-4">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "active"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Active
              {activeListings.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                  {activeListings.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("ended")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "ended"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Ended
              {endedListings.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {endedListings.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse"
              >
                <div className="aspect-[2/3] bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "active" ? (
          <>
            {activeListings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No active listings</p>
                <p className="mt-2">
                  Create your first listing from your collection!
                </p>
                <button
                  onClick={() => router.push("/collection")}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Collection
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Active Fixed-Price Listings */}
                {activeFixedPrice.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Tag className="w-5 h-5 text-green-600" />
                      For Sale ({activeFixedPrice.length})
                    </h2>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                      {activeFixedPrice.map((listing) => (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          onClick={() => handleListingClick(listing)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Auctions */}
                {activeAuctions.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Gavel className="w-5 h-5 text-blue-600" />
                      Auctions ({activeAuctions.length})
                    </h2>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                      {activeAuctions.map((auction) => (
                        <AuctionCard
                          key={auction.id}
                          auction={auction}
                          onClick={() => handleListingClick(auction)}
                          showSeller={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {endedListings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No ended listings</p>
                <p className="mt-2">Your completed listings will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {endedListings.map((listing) => (
                  <div
                    key={listing.id}
                    onClick={() => handleListingClick(listing)}
                    className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer opacity-75 hover:opacity-100 transition-opacity"
                  >
                    <div className="aspect-[2/3] bg-gray-100 relative">
                      {listing.comic?.coverImageUrl && (
                        <img
                          src={listing.comic.coverImageUrl}
                          alt=""
                          className="w-full h-full object-cover grayscale"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="px-3 py-1 bg-gray-900 text-white text-sm rounded-full">
                          {listing.status === "sold" ? "Sold" : listing.status === "cancelled" ? "Cancelled" : "Ended"}
                        </span>
                      </div>
                      {/* Listing type badge */}
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          listing.listingType === "auction"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {listing.listingType === "auction" ? "Auction" : "Sale"}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {listing.comic?.comic?.title || "Unknown"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {listing.listingType === "auction"
                          ? listing.winningBid
                            ? `Final: ${formatPrice(listing.winningBid)}`
                            : "No bids"
                          : `Price: ${formatPrice(listing.startingPrice)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Auction Detail Modal */}
      <AuctionDetailModal
        auctionId={selectedAuctionId || ""}
        isOpen={!!selectedAuctionId}
        onClose={() => setSelectedAuctionId(null)}
        onAuctionUpdated={loadListings}
      />

      {/* Listing Detail Modal */}
      <ListingDetailModal
        listingId={selectedListingId || ""}
        isOpen={!!selectedListingId}
        onClose={() => setSelectedListingId(null)}
        onListingUpdated={loadListings}
      />
    </div>
  );
}
