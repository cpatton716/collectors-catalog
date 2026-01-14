"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { storage } from "@/lib/storage";
import { calculateCollectionValue, getComicValue } from "@/lib/gradePrice";
import { useGuestScans } from "@/hooks/useGuestScans";
import { CollectionItem } from "@/types/comic";
import {
  Camera,
  BookOpen,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  DollarSign,
  Tag,
  Clock,
  ChevronRight,
  Flame,
  X,
  Trophy,
  Loader2,
  RefreshCw,
} from "lucide-react";

// Duration filter options
type DurationDays = 30 | 60 | 90;

// Hottest books client-side cache (24 hours)
const HOT_BOOKS_CACHE_KEY = "hottest_books_cache";
const HOT_BOOKS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

interface HotBooksCache {
  books: HotBook[];
  timestamp: number;
}

function getCachedHotBooks(): HotBook[] | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(HOT_BOOKS_CACHE_KEY);
    if (!cached) return null;

    const { books, timestamp }: HotBooksCache = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age < HOT_BOOKS_CACHE_TTL) {
      return books;
    }
    // Cache expired, remove it
    localStorage.removeItem(HOT_BOOKS_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function setCachedHotBooks(books: HotBook[]): void {
  if (typeof window === "undefined") return;
  try {
    const cache: HotBooksCache = {
      books,
      timestamp: Date.now(),
    };
    localStorage.setItem(HOT_BOOKS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage might be full or disabled
  }
}

interface InsightBook {
  item: CollectionItem;
  change: number;
  changePercent: number;
  currentValue: number;
  previousValue: number;
}

interface BestBuyBook {
  item: CollectionItem;
  roi: number;
  purchasePrice: number;
  currentValue: number;
  profit: number;
}

interface HotBook {
  rank: number;
  title: string;
  issueNumber: string;
  publisher: string;
  year: string;
  keyFacts: string[];
  whyHot: string;
  priceRange: {
    low: number;
    mid: number;
    high: number;
  };
  coverImageUrl?: string;
}

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { count: guestScanCount } = useGuestScans();
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<CollectionItem[]>([]);
  const [salesStats, setSalesStats] = useState({ totalSales: 0, totalRevenue: 0, totalProfit: 0 });

  // Insight modals state
  const [showBiggestIncrease, setShowBiggestIncrease] = useState(false);
  const [showBestBuy, setShowBestBuy] = useState(false);
  const [showBiggestDecline, setShowBiggestDecline] = useState(false);
  const [increaseDuration, setIncreaseDuration] = useState<DurationDays>(30);
  const [declineDuration, setDeclineDuration] = useState<DurationDays>(30);

  // Hottest books state
  const [hotBooks, setHotBooks] = useState<HotBook[]>([]);
  const [hotBooksLoading, setHotBooksLoading] = useState(true);
  const [hotBooksError, setHotBooksError] = useState<string | null>(null);

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

  // Fetch hottest books for all users (with client-side caching)
  useEffect(() => {
    const fetchHotBooks = async () => {
      // Check client-side cache first (prevents unnecessary API calls)
      const cached = getCachedHotBooks();
      if (cached && cached.length > 0) {
        console.log("Using cached hottest books from localStorage");
        setHotBooks(cached);
        setHotBooksLoading(false);
        return;
      }

      setHotBooksLoading(true);
      setHotBooksError(null);
      try {
        const response = await fetch("/api/hottest-books");
        const data = await response.json();
        if (data.error) {
          setHotBooksError(data.error);
        } else {
          const books = data.books || [];
          setHotBooks(books);
          // Cache the result in localStorage for 24 hours
          if (books.length > 0) {
            setCachedHotBooks(books);
            console.log("Cached hottest books to localStorage");
          }
        }
      } catch (err) {
        console.error("Error fetching hot books:", err);
        setHotBooksError("Couldn't load hottest books");
      } finally {
        setHotBooksLoading(false);
      }
    };
    fetchHotBooks();
  }, []);

  // Calculate stats from collection using grade-aware pricing
  const collectionValue = calculateCollectionValue(collection);
  const stats = {
    totalComics: collection.length,
    totalValue: collectionValue.totalValue,
    unpricedCount: collectionValue.unpricedCount,
    totalCost: collection.reduce(
      (sum, item) => sum + (item.purchasePrice || 0),
      0
    ),
  };
  const profitLoss = stats.totalValue - stats.totalCost;
  const profitLossPercent = stats.totalCost > 0 ? ((profitLoss / stats.totalCost) * 100) : 0;

  // Calculate biggest increase (simulated based on current value vs "historical")
  // In production, this would use actual price history data
  const getBiggestIncrease = (days: DurationDays): InsightBook | null => {
    const booksWithValue = collection.filter(
      (item) => item.comic.priceData?.estimatedValue && item.comic.priceData.estimatedValue > 0
    );

    if (booksWithValue.length === 0) return null;

    // Simulate historical value change based on days
    // In production, use actual price history from database
    const multiplier = days === 30 ? 0.92 : days === 60 ? 0.88 : 0.82;

    let biggest: InsightBook | null = null;

    for (const item of booksWithValue) {
      const currentValue = getComicValue(item);
      // Simulate previous value (in production, fetch from price history)
      const previousValue = currentValue * multiplier;
      const change = currentValue - previousValue;
      const changePercent = previousValue > 0 ? ((change / previousValue) * 100) : 0;

      if (!biggest || change > biggest.change) {
        biggest = { item, change, changePercent, currentValue, previousValue };
      }
    }

    return biggest;
  };

  // Calculate biggest decline
  const getBiggestDecline = (days: DurationDays): InsightBook | null => {
    const booksWithValue = collection.filter(
      (item) => item.comic.priceData?.estimatedValue && item.comic.priceData.estimatedValue > 0
    );

    if (booksWithValue.length === 0) return null;

    // Simulate some books declining in value
    // In production, use actual price history from database
    const declineMultiplier = days === 30 ? 1.05 : days === 60 ? 1.1 : 1.15;

    let biggest: InsightBook | null = null;

    for (const item of booksWithValue) {
      const currentValue = getComicValue(item);
      // Simulate previous value being higher (decline)
      const previousValue = currentValue * declineMultiplier;
      const change = currentValue - previousValue; // This will be negative
      const changePercent = previousValue > 0 ? ((change / previousValue) * 100) : 0;

      if (!biggest || change < biggest.change) {
        biggest = { item, change, changePercent, currentValue, previousValue };
      }
    }

    return biggest;
  };

  // Calculate best buy (best ROI)
  const getBestBuy = (): BestBuyBook | null => {
    const booksWithPurchasePrice = collection.filter(
      (item) => item.purchasePrice && item.purchasePrice > 0 && item.comic.priceData?.estimatedValue
    );

    if (booksWithPurchasePrice.length === 0) return null;

    let best: BestBuyBook | null = null;

    for (const item of booksWithPurchasePrice) {
      const currentValue = getComicValue(item);
      const purchasePrice = item.purchasePrice!;
      const profit = currentValue - purchasePrice;
      const roi = ((profit / purchasePrice) * 100);

      if (!best || roi > best.roi) {
        best = { item, roi, purchasePrice, currentValue, profit };
      }
    }

    return best;
  };

  const biggestIncrease = getBiggestIncrease(increaseDuration);
  const biggestDecline = getBiggestDecline(declineDuration);
  const bestBuy = getBestBuy();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          {isLoaded && isSignedIn ? "A Look in Your Chest" : "Catalog Your Collection"}
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          {isLoaded && isSignedIn
            ? "Your collection at a glance. Track value changes, see your best investments, and discover what's hot in the market."
            : "Scan covers with technopathic recognition, track your collection's value, discover key issues, and connect with fellow collectors to buy and sell."}
        </p>

        {/* Scan CTA */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
          >
            <Camera className="w-5 h-5" />
            {isLoaded && isSignedIn
              ? "Scan a Book"
              : guestScanCount > 0
                ? "Scan Another Book"
                : "Scan Your First Book"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Collection Insights Cards - Only for signed-in users with collection */}
        {isLoaded && isSignedIn && stats.totalComics > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto">
            {/* Biggest Increase Card */}
            {biggestIncrease && (
              <button
                onClick={() => setShowBiggestIncrease(true)}
                className="bg-white rounded-xl p-4 shadow-sm border border-green-200 hover:shadow-md hover:border-green-300 transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Biggest Increase</p>
                    <p className="text-lg font-bold text-green-600">
                      +${biggestIncrease.change.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {biggestIncrease.item.coverImageUrl && (
                    <img
                      src={biggestIncrease.item.coverImageUrl}
                      alt=""
                      className="w-10 h-14 object-cover rounded"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {biggestIncrease.item.comic.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      #{biggestIncrease.item.comic.issueNumber}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Best Buy Card */}
            {bestBuy && (
              <button
                onClick={() => setShowBestBuy(true)}
                className="bg-white rounded-xl p-4 shadow-sm border border-purple-200 hover:shadow-md hover:border-purple-300 transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Trophy className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Best Buy</p>
                    <p className="text-lg font-bold text-purple-600">
                      +{bestBuy.roi.toFixed(0)}% ROI
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {bestBuy.item.coverImageUrl && (
                    <img
                      src={bestBuy.item.coverImageUrl}
                      alt=""
                      className="w-10 h-14 object-cover rounded"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {bestBuy.item.comic.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      #{bestBuy.item.comic.issueNumber}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Biggest Decline Card */}
            {biggestDecline && (
              <button
                onClick={() => setShowBiggestDecline(true)}
                className="bg-white rounded-xl p-4 shadow-sm border border-red-200 hover:shadow-md hover:border-red-300 transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Biggest Decline</p>
                    <p className="text-lg font-bold text-red-600">
                      ${biggestDecline.change.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {biggestDecline.item.coverImageUrl && (
                    <img
                      src={biggestDecline.item.coverImageUrl}
                      alt=""
                      className="w-10 h-14 object-cover rounded"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {biggestDecline.item.comic.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      #{biggestDecline.item.comic.issueNumber}
                    </p>
                  </div>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Features - Only shown to non-logged-in users */}
        {isLoaded && !isSignedIn && (
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
        )}

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
      </div>

      {/* Collection Value Dashboard - Prominent Card for Logged-in Users */}
      {isLoaded && isSignedIn && stats.totalComics > 0 && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium opacity-90 mb-1">Collection Value</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-bold">
                    ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {stats.unpricedCount > 0 && (
                    <span className="text-sm opacity-75">
                      ({stats.unpricedCount} unpriced)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{stats.totalComics}</p>
                  <p className="text-sm opacity-75">Comics</p>
                </div>
                <div className="h-12 w-px bg-white/20" />
                <Link
                  href="/collection"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
                >
                  <BookOpen className="w-5 h-5" />
                  View Collection
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  ${stats.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* Professor's Hottest Books - Inline List */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Professor&apos;s Hottest Books
              </h2>
              <p className="text-sm text-gray-500">
                Weekly market analysis of the most in-demand comics
              </p>
            </div>
          </div>
          <Link
            href="/hottest-books"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {hotBooksLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : hotBooksError ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">{hotBooksError}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {hotBooks.slice(0, 5).map((book) => (
              <Link
                key={book.rank}
                href="/hottest-books"
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {book.rank}
                  </div>
                  {book.coverImageUrl && (
                    <img
                      src={book.coverImageUrl}
                      alt={`${book.title} #${book.issueNumber}`}
                      className="w-12 h-18 object-cover rounded shadow-sm"
                    />
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                  {book.title} #{book.issueNumber}
                </h3>
                <p className="text-xs text-gray-500 mb-2">
                  {book.publisher}
                </p>
                <div className="flex items-center gap-1 text-sm">
                  <DollarSign className="w-3 h-3 text-green-600" />
                  <span className="font-medium text-green-600">${book.priceRange.mid}</span>
                  <span className="text-gray-400 text-xs">mid</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

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
                  {item.coverImageUrl ? (
                    <img
                      src={item.coverImageUrl}
                      alt={`${item.comic.title} #${item.comic.issueNumber}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-3xl">
                      <span className="text-green-400 font-bold italic drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]">?</span>
                    </div>
                  )}
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

      {/* Biggest Increase Modal */}
      {showBiggestIncrease && biggestIncrease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowBiggestIncrease(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <button
              onClick={() => setShowBiggestIncrease(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Biggest Increase</h3>
            </div>

            {/* Duration Filter */}
            <div className="flex gap-2 mb-4">
              {([30, 60, 90] as DurationDays[]).map((days) => (
                <button
                  key={days}
                  onClick={() => setIncreaseDuration(days)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    increaseDuration === days
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>

            {/* Book Info */}
            <div className="flex gap-4 mb-4">
              {biggestIncrease.item.coverImageUrl && (
                <img
                  src={biggestIncrease.item.coverImageUrl}
                  alt=""
                  className="w-24 h-36 object-cover rounded-lg shadow-md"
                />
              )}
              <div>
                <h4 className="font-semibold text-gray-900">
                  {biggestIncrease.item.comic.title}
                </h4>
                <p className="text-sm text-gray-500 mb-3">
                  #{biggestIncrease.item.comic.issueNumber}
                </p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-green-600">
                    +${biggestIncrease.change.toFixed(2)}
                  </p>
                  <p className="text-sm text-green-600">
                    +{biggestIncrease.changePercent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    Current: ${biggestIncrease.currentValue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Best Buy Modal */}
      {showBestBuy && bestBuy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowBestBuy(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <button
              onClick={() => setShowBestBuy(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Trophy className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Best Buy</h3>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Highest ROI based on purchase price
            </p>

            {/* Book Info */}
            <div className="flex gap-4 mb-4">
              {bestBuy.item.coverImageUrl && (
                <img
                  src={bestBuy.item.coverImageUrl}
                  alt=""
                  className="w-24 h-36 object-cover rounded-lg shadow-md"
                />
              )}
              <div>
                <h4 className="font-semibold text-gray-900">
                  {bestBuy.item.comic.title}
                </h4>
                <p className="text-sm text-gray-500 mb-3">
                  #{bestBuy.item.comic.issueNumber}
                </p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-purple-600">
                    +{bestBuy.roi.toFixed(0)}% ROI
                  </p>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>Paid: ${bestBuy.purchasePrice.toFixed(2)}</p>
                    <p>Value: ${bestBuy.currentValue.toFixed(2)}</p>
                    <p className="text-green-600 font-medium">
                      Profit: +${bestBuy.profit.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Biggest Decline Modal */}
      {showBiggestDecline && biggestDecline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowBiggestDecline(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <button
              onClick={() => setShowBiggestDecline(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Biggest Decline</h3>
            </div>

            {/* Duration Filter */}
            <div className="flex gap-2 mb-4">
              {([30, 60, 90] as DurationDays[]).map((days) => (
                <button
                  key={days}
                  onClick={() => setDeclineDuration(days)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    declineDuration === days
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>

            {/* Book Info */}
            <div className="flex gap-4 mb-4">
              {biggestDecline.item.coverImageUrl && (
                <img
                  src={biggestDecline.item.coverImageUrl}
                  alt=""
                  className="w-24 h-36 object-cover rounded-lg shadow-md"
                />
              )}
              <div>
                <h4 className="font-semibold text-gray-900">
                  {biggestDecline.item.comic.title}
                </h4>
                <p className="text-sm text-gray-500 mb-3">
                  #{biggestDecline.item.comic.issueNumber}
                </p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-red-600">
                    ${biggestDecline.change.toFixed(2)}
                  </p>
                  <p className="text-sm text-red-600">
                    {biggestDecline.changePercent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    Current: ${biggestDecline.currentValue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
