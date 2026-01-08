"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { storage } from "@/lib/storage";
import { CollectionItem } from "@/types/comic";
import {
  Camera,
  BookOpen,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  DollarSign,
  Tag,
  Clock,
  ChevronRight,
  Flame,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<CollectionItem[]>([]);
  const [salesStats, setSalesStats] = useState({ totalSales: 0, totalRevenue: 0, totalProfit: 0 });

  useEffect(() => {
    // Only load collection data for signed-in users
    if (isLoaded && isSignedIn) {
      setCollection(storage.getCollection());
      setRecentlyViewed(storage.getRecentlyViewedItems());
      setSalesStats(storage.getSalesStats());
    } else {
      // Clear data for logged-out users
      setCollection([]);
      setRecentlyViewed([]);
      setSalesStats({ totalSales: 0, totalRevenue: 0, totalProfit: 0 });
    }
  }, [isLoaded, isSignedIn]);

  // Calculate stats from collection
  const stats = {
    totalComics: collection.length,
    totalValue: collection.reduce(
      (sum, item) => sum + (item.comic.priceData?.estimatedValue || 0),
      0
    ),
    totalCost: collection.reduce(
      (sum, item) => sum + (item.purchasePrice || 0),
      0
    ),
  };
  const profitLoss = stats.totalValue - stats.totalCost;
  const profitLossPercent = stats.totalCost > 0 ? ((profitLoss / stats.totalCost) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          Powered by AI Vision
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Catalog Your Collection
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Upload a photo and we&apos;ll instantly identify the title, issue #,
          publisher, creators, key info, and more.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Technopathic Recognition
            </h3>
            <p className="text-gray-600">
              Upload a photo and we&apos;ll instantly identify the title, issue #,
              publisher, creators, key info, and more.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Track Values
            </h3>
            <p className="text-gray-600">
              Monitor the market value of your comics with price history charts
              and alerts for significant changes.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Tag className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Buy & Sell
            </h3>
            <p className="text-gray-600">
              List your comics for sale and connect with other collectors. Secure
              transactions powered by Stripe.
            </p>
          </div>
        </div>

        {/* How It Works - Only shown to non-logged-in users */}
        {isLoaded && !isSignedIn && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  1
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Upload Photo</h4>
                <p className="text-sm text-gray-600">
                  Take a photo or upload an image of your comic cover
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  2
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Analyze</h4>
                <p className="text-sm text-gray-600">
                  Uses our Technopathy to identify the book&apos;s details
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  3
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Verify & Edit</h4>
                <p className="text-sm text-gray-600">
                  Review the details and make any necessary corrections
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  4
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Save & Track</h4>
                <p className="text-sm text-gray-600">
                  Add to your collection and track its value over time
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
          >
            <Camera className="w-5 h-5" />
            {isLoaded && isSignedIn ? "Scan a Book" : "Scan Your First Book"}
            <ArrowRight className="w-4 h-4" />
          </Link>
          {isLoaded && isSignedIn && (
            <Link
              href="/collection"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <BookOpen className="w-5 h-5" />
              View Collection
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats.totalComics > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Comics</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats.totalComics}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Cost</p>
                <p className="text-xl font-bold text-gray-900">
                  ${stats.totalCost.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Est. Value</p>
                <p className="text-xl font-bold text-gray-900">
                  ${stats.totalValue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Receipt className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Sales ({salesStats.totalSales})</p>
                <p className="text-xl font-bold text-gray-900">
                  ${salesStats.totalRevenue.toFixed(2)}
                </p>
                {salesStats.totalProfit !== 0 && (
                  <p className={`text-xs ${salesStats.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {salesStats.totalProfit >= 0 ? '+' : ''}${salesStats.totalProfit.toFixed(2)} profit
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-xl p-4 shadow-sm border ${profitLoss >= 0 ? 'border-green-200' : 'border-red-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${profitLoss >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {profitLoss >= 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Profit/Loss</p>
                <p className={`text-xl font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)}
                </p>
                {stats.totalCost > 0 && (
                  <p className={`text-xs ${profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professor's Hottest Books */}
      <Link
        href="/hottest-books"
        className="block mb-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Professor&apos;s Hottest Books
              </h2>
              <p className="text-white/80 text-sm">
                Weekly market analysis of the most in-demand comics
              </p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-white/80" />
        </div>
      </Link>

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              Recently Viewed
            </h2>
            <Link
              href="/collection"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {recentlyViewed.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push("/collection")}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="aspect-[2/3] bg-gray-100 relative">
                  <img
                    src={item.coverImageUrl}
                    alt={`${item.comic.title} #${item.comic.issueNumber}`}
                    className="w-full h-full object-cover"
                  />
                  {item.comic.priceData?.estimatedValue && (
                    <div className="absolute bottom-2 right-2">
                      <span className="px-2 py-1 bg-black/70 text-white text-xs font-bold rounded-lg">
                        ${item.comic.priceData.estimatedValue.toFixed(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {item.comic.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    #{item.comic.issueNumber}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
