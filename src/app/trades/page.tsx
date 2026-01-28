"use client";

import { Suspense, useEffect, useState } from "react";

import Link from "next/link";

import { useAuth } from "@clerk/nextjs";

import { ArrowLeftRight, History, Package } from "lucide-react";

import { TradePreview } from "@/types/trade";
import { TradeCard } from "@/components/trading";

type TradesTab = "active" | "history";

export default function TradesPage() {
  return (
    <Suspense fallback={<TradesPageSkeleton />}>
      <TradesPageContent />
    </Suspense>
  );
}

function TradesPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="mt-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white h-32 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

function TradesPageContent() {
  const { isSignedIn, isLoaded } = useAuth();
  const [activeTab, setActiveTab] = useState<TradesTab>("active");
  const [trades, setTrades] = useState<TradePreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTrades = async () => {
    setIsLoading(true);
    try {
      const statuses =
        activeTab === "active"
          ? "proposed,accepted,shipped"
          : "completed,cancelled,declined";

      const response = await fetch(`/api/trades?status=${statuses}`);
      if (response.ok) {
        const data = await response.json();
        setTrades(data.trades || []);
      }
    } catch (error) {
      console.error("Error loading trades:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadTrades();
    }
  }, [isLoaded, isSignedIn, activeTab]);

  if (!isLoaded) {
    return <TradesPageSkeleton />;
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="bg-pop-white border-3 border-pop-black p-8 text-center"
          style={{ boxShadow: "4px 4px 0px #000" }}
        >
          <h1 className="text-2xl font-black font-comic mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-4">Sign in to view and manage your trades</p>
          <Link
            href="/sign-in"
            className="inline-block px-6 py-2 bg-pop-blue text-white font-bold border-2 border-pop-black shadow-[3px_3px_0px_#000]"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-black text-pop-black font-comic">TRADES</h1>
        <p className="text-gray-600 mt-1">Manage your comic trades</p>

        {/* Tabs */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex items-center gap-2 px-4 py-2 font-bold border-2 border-pop-black transition-all ${
              activeTab === "active"
                ? "bg-pop-orange text-white shadow-[3px_3px_0px_#000]"
                : "bg-pop-white text-pop-black hover:shadow-[2px_2px_0px_#000]"
            }`}
          >
            <Package className="w-4 h-4" />
            Active
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 font-bold border-2 border-pop-black transition-all ${
              activeTab === "history"
                ? "bg-pop-blue text-white shadow-[3px_3px_0px_#000]"
                : "bg-pop-white text-pop-black hover:shadow-[2px_2px_0px_#000]"
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>

        {/* Content */}
        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white border-3 border-pop-black h-32 animate-pulse"
                />
              ))}
            </div>
          ) : trades.length === 0 ? (
            <div
              className="bg-pop-white border-3 border-pop-black p-12 text-center"
              style={{ boxShadow: "4px 4px 0px #000" }}
            >
              <div className="w-16 h-16 bg-pop-yellow border-3 border-pop-black flex items-center justify-center mx-auto mb-4">
                <ArrowLeftRight className="w-8 h-8 text-pop-black" />
              </div>
              <p className="text-xl font-black text-pop-black font-comic uppercase">
                {activeTab === "active" ? "No active trades" : "No trade history"}
              </p>
              <p className="mt-2 text-gray-600">
                {activeTab === "active"
                  ? "Start trading by browsing the Shop's For Trade tab"
                  : "Your completed trades will appear here"}
              </p>
              {activeTab === "active" && (
                <Link
                  href="/shop?tab=for-trade"
                  className="inline-block mt-4 px-6 py-2 bg-pop-orange text-white font-bold border-2 border-pop-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] transition-all"
                >
                  Browse Trades
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {trades.map((trade) => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  onStatusChange={loadTrades}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
