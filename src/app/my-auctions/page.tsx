"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Gavel,
  Package,
  Trophy,
  Clock,
  DollarSign,
  Plus,
  AlertCircle,
} from "lucide-react";
import { Auction, formatPrice } from "@/types/auction";
import { AuctionCard, AuctionDetailModal } from "@/components/auction";

type AuctionTab = "selling" | "won" | "payment-pending";

export default function MyAuctionsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AuctionTab>("selling");
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [wonAuctions, setWonAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isSignedIn) {
      loadAuctions();
    }
  }, [isSignedIn]);

  const loadAuctions = async () => {
    setIsLoading(true);
    try {
      // Load seller's auctions
      const sellerResponse = await fetch("/api/auctions?sellerId=me");
      if (sellerResponse.ok) {
        const data = await sellerResponse.json();
        setAuctions(data.auctions || []);
      }

      // Load won auctions
      // TODO: Add endpoint for won auctions
    } catch (error) {
      console.error("Error loading auctions:", error);
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

  const activeAuctions = auctions.filter((a) => a.status === "active");
  const endedAuctions = auctions.filter((a) => a.status !== "active");
  const paymentPending = wonAuctions.filter(
    (a) => a.paymentStatus === "pending"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Auctions</h1>
              <p className="text-gray-600 mt-1">
                Manage your auctions and purchases
              </p>
            </div>
            <button
              onClick={() => router.push("/collection")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Auction</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="container mx-auto px-4">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab("selling")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "selling"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Gavel className="w-4 h-4" />
              Selling
              {activeAuctions.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                  {activeAuctions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("won")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "won"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Trophy className="w-4 h-4" />
              Won
            </button>
            <button
              onClick={() => setActiveTab("payment-pending")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "payment-pending"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Clock className="w-4 h-4" />
              Payment Pending
              {paymentPending.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                  {paymentPending.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
        ) : activeTab === "selling" ? (
          <>
            {activeAuctions.length === 0 && endedAuctions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Gavel className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No auctions yet</p>
                <p className="mt-2">
                  Create your first auction from your collection!
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
                {/* Active Auctions */}
                {activeAuctions.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Active Auctions
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {activeAuctions.map((auction) => (
                        <AuctionCard
                          key={auction.id}
                          auction={auction}
                          onClick={() => setSelectedAuctionId(auction.id)}
                          showSeller={false}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Ended Auctions */}
                {endedAuctions.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Past Auctions
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {endedAuctions.map((auction) => (
                        <div
                          key={auction.id}
                          onClick={() => setSelectedAuctionId(auction.id)}
                          className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer opacity-75 hover:opacity-100 transition-opacity"
                        >
                          <div className="aspect-[2/3] bg-gray-100 relative">
                            {auction.comic?.coverImageUrl && (
                              <img
                                src={auction.comic.coverImageUrl}
                                alt=""
                                className="w-full h-full object-cover grayscale"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <span className="px-3 py-1 bg-gray-900 text-white text-sm rounded-full">
                                {auction.status === "sold" ? "Sold" : "Ended"}
                              </span>
                            </div>
                          </div>
                          <div className="p-3">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {auction.comic?.comic?.title || "Unknown"}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {auction.winningBid
                                ? `Final: ${formatPrice(auction.winningBid)}`
                                : "No bids"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : activeTab === "won" ? (
          <div className="text-center py-12 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No won auctions yet</p>
            <p className="mt-2">Start bidding on auctions in the Shop!</p>
            <button
              onClick={() => router.push("/shop")}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Auctions
            </button>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No pending payments</p>
            <p className="mt-2">All caught up!</p>
          </div>
        )}
      </div>

      {/* Auction Detail Modal */}
      <AuctionDetailModal
        auctionId={selectedAuctionId || ""}
        isOpen={!!selectedAuctionId}
        onClose={() => setSelectedAuctionId(null)}
        onAuctionUpdated={loadAuctions}
      />
    </div>
  );
}
