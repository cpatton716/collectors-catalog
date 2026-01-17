"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { storage } from "@/lib/storage";
import { calculateCollectionValue, getComicValue } from "@/lib/gradePrice";
import { formatCurrency } from "@/lib/statsCalculator";
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
const HOT_BOOKS_CACHE_TTL = 24 * 60 * 60 * 1000;

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
    if (isLoaded && isSignedIn) {
      setCollection(storage.getCollection());
      setRecentlyViewed(storage.getRecentlyViewedItems());
      setSalesStats(storage.getSalesStats());
    } else {
      setCollection([]);
      setRecentlyViewed([]);
      setSalesStats({ totalSales: 0, totalRevenue: 0, totalProfit: 0 });
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    const fetchHotBooks = async () => {
      const cached = getCachedHotBooks();
      if (cached && cached.length > 0) {
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
          if (books.length > 0) {
            setCachedHotBooks(books);
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

  const getBiggestIncrease = (days: DurationDays): InsightBook | null => {
    const booksWithValue = collection.filter(
      (item) => item.comic.priceData?.estimatedValue && item.comic.priceData.estimatedValue > 0
    );

    if (booksWithValue.length === 0) return null;

    const multiplier = days === 30 ? 0.92 : days === 60 ? 0.88 : 0.82;
    let biggest: InsightBook | null = null;

    for (const item of booksWithValue) {
      const currentValue = getComicValue(item);
      const previousValue = currentValue * multiplier;
      const change = currentValue - previousValue;
      const changePercent = previousValue > 0 ? ((change / previousValue) * 100) : 0;

      if (!biggest || change > biggest.change) {
        biggest = { item, change, changePercent, currentValue, previousValue };
      }
    }

    return biggest;
  };

  const getBiggestDecline = (days: DurationDays): InsightBook | null => {
    const booksWithValue = collection.filter(
      (item) => item.comic.priceData?.estimatedValue && item.comic.priceData.estimatedValue > 0
    );

    if (booksWithValue.length === 0) return null;

    const declineMultiplier = days === 30 ? 1.05 : days === 60 ? 1.1 : 1.15;
    let biggest: InsightBook | null = null;

    for (const item of booksWithValue) {
      const currentValue = getComicValue(item);
      const previousValue = currentValue * declineMultiplier;
      const change = currentValue - previousValue;
      const changePercent = previousValue > 0 ? ((change / previousValue) * 100) : 0;

      if (!biggest || change < biggest.change) {
        biggest = { item, change, changePercent, currentValue, previousValue };
      }
    }

    return biggest;
  };

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
      {/* Hero Section - Vintage Newspaper Style */}
      <div className="text-center py-12">
        {/* Main Headline */}
        <div className="mb-6">
          <div className="inline-block bg-vintage-red px-4 py-1 mb-4">
            <span className="font-mono text-xs text-white uppercase tracking-widest">
              Est. 2024 &bull; The Collector&apos;s Companion
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl text-vintage-ink uppercase tracking-tight leading-none mb-4">
            {isLoaded && isSignedIn ? "A Look in Your Chest" : "Catalog Your Collection"}
          </h1>
          <div className="w-32 h-1 bg-vintage-ink mx-auto mb-4" />
          <p className="font-serif text-xl text-vintage-inkSoft max-w-2xl mx-auto leading-relaxed">
            {isLoaded && isSignedIn
              ? "Your collection at a glance. Track value changes, see your best investments, and discover what's hot in the market."
              : "Scan covers with technopathic recognition, track your collection's value, discover key issues, and connect with fellow collectors to buy and sell."}
          </p>
        </div>

        {/* Scan CTA - Vintage Button */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Link
            href="/scan"
            className="btn-vintage btn-primary inline-flex items-center gap-3 px-8 py-4 text-lg"
          >
            <Camera className="w-6 h-6" />
            {isLoaded && isSignedIn
              ? "Scan a Book"
              : guestScanCount > 0
                ? "Scan Another Book"
                : "Scan Your First Book"}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Collection Insights Cards - Vintage Style */}
        {isLoaded && isSignedIn && stats.totalComics > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto">
            {/* Biggest Increase Card */}
            {biggestIncrease && (
              <button
                onClick={() => setShowBiggestIncrease(true)}
                className="comic-card p-4 text-left group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-600 border-2 border-vintage-ink">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-mono text-xs text-vintage-inkFaded uppercase tracking-wider">Biggest Increase</p>
                    <p className="font-display text-xl text-green-600">
                      +${biggestIncrease.change.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {biggestIncrease.item.coverImageUrl && (
                    <img
                      src={biggestIncrease.item.coverImageUrl}
                      alt=""
                      className="w-10 h-14 object-cover border-2 border-vintage-ink"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-display text-sm text-vintage-ink truncate uppercase">
                      {biggestIncrease.item.comic.title}
                    </p>
                    <p className="font-mono text-xs text-vintage-inkFaded">
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
                className="comic-card p-4 text-left group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-vintage-blue border-2 border-vintage-ink">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-mono text-xs text-vintage-inkFaded uppercase tracking-wider">Best Buy</p>
                    <p className="font-display text-xl text-vintage-blue">
                      +{bestBuy.roi.toFixed(0)}% ROI
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {bestBuy.item.coverImageUrl && (
                    <img
                      src={bestBuy.item.coverImageUrl}
                      alt=""
                      className="w-10 h-14 object-cover border-2 border-vintage-ink"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-display text-sm text-vintage-ink truncate uppercase">
                      {bestBuy.item.comic.title}
                    </p>
                    <p className="font-mono text-xs text-vintage-inkFaded">
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
                className="comic-card p-4 text-left group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-vintage-red border-2 border-vintage-ink">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-mono text-xs text-vintage-inkFaded uppercase tracking-wider">Biggest Decline</p>
                    <p className="font-display text-xl text-vintage-red">
                      ${biggestDecline.change.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {biggestDecline.item.coverImageUrl && (
                    <img
                      src={biggestDecline.item.coverImageUrl}
                      alt=""
                      className="w-10 h-14 object-cover border-2 border-vintage-ink"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-display text-sm text-vintage-ink truncate uppercase">
                      {biggestDecline.item.comic.title}
                    </p>
                    <p className="font-mono text-xs text-vintage-inkFaded">
                      #{biggestDecline.item.comic.issueNumber}
                    </p>
                  </div>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Features - Vintage Style for non-logged-in users */}
        {isLoaded && !isSignedIn && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
            <div className="comic-card p-6 text-center">
              <div className="w-16 h-16 bg-vintage-blue border-3 border-vintage-ink flex items-center justify-center mx-auto mb-4 shadow-vintage-sm">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-display text-lg text-vintage-ink uppercase tracking-wide mb-2">
                Technopathic Recognition
              </h3>
              <p className="font-serif text-vintage-inkSoft">
                Upload a photo and we&apos;ll instantly identify the title, issue #,
                publisher, creators, key info, and more.
              </p>
            </div>

            <div className="comic-card p-6 text-center">
              <div className="w-16 h-16 bg-green-600 border-3 border-vintage-ink flex items-center justify-center mx-auto mb-4 shadow-vintage-sm">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-display text-lg text-vintage-ink uppercase tracking-wide mb-2">
                Track Values
              </h3>
              <p className="font-serif text-vintage-inkSoft">
                Monitor the market value of your comics with price history charts
                and alerts for significant changes.
              </p>
            </div>

            <div className="comic-card p-6 text-center">
              <div className="w-16 h-16 bg-vintage-yellow border-3 border-vintage-ink flex items-center justify-center mx-auto mb-4 shadow-vintage-sm">
                <Tag className="w-8 h-8 text-vintage-ink" />
              </div>
              <h3 className="font-display text-lg text-vintage-ink uppercase tracking-wide mb-2">
                Buy & Sell
              </h3>
              <p className="font-serif text-vintage-inkSoft">
                List your comics for sale and connect with other collectors. Secure
                transactions powered by Stripe.
              </p>
            </div>
          </div>
        )}

        {/* How It Works - Vintage Newspaper Section */}
        {isLoaded && !isSignedIn && (
          <div className="comic-card p-8 mb-8 max-w-4xl mx-auto">
            <div className="border-b-4 border-vintage-ink pb-4 mb-6">
              <h2 className="font-display text-3xl text-vintage-ink uppercase tracking-wide text-center">
                How It Works
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-vintage-red border-3 border-vintage-ink text-white font-display text-xl flex items-center justify-center mx-auto mb-3 shadow-vintage-sm">
                  1
                </div>
                <h4 className="font-display text-sm text-vintage-ink uppercase tracking-wide mb-1">Upload Photo</h4>
                <p className="font-serif text-sm text-vintage-inkSoft">
                  Take a photo or upload an image of your comic cover
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-vintage-red border-3 border-vintage-ink text-white font-display text-xl flex items-center justify-center mx-auto mb-3 shadow-vintage-sm">
                  2
                </div>
                <h4 className="font-display text-sm text-vintage-ink uppercase tracking-wide mb-1">Analyze</h4>
                <p className="font-serif text-sm text-vintage-inkSoft">
                  Uses our Technopathy to identify the book&apos;s details
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-vintage-red border-3 border-vintage-ink text-white font-display text-xl flex items-center justify-center mx-auto mb-3 shadow-vintage-sm">
                  3
                </div>
                <h4 className="font-display text-sm text-vintage-ink uppercase tracking-wide mb-1">Verify & Edit</h4>
                <p className="font-serif text-sm text-vintage-inkSoft">
                  Review the details and make any necessary corrections
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-vintage-red border-3 border-vintage-ink text-white font-display text-xl flex items-center justify-center mx-auto mb-3 shadow-vintage-sm">
                  4
                </div>
                <h4 className="font-display text-sm text-vintage-ink uppercase tracking-wide mb-1">Save & Track</h4>
                <p className="font-serif text-sm text-vintage-inkSoft">
                  Add to your collection and track its value over time
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collection Value Dashboard - Vintage Banner */}
      {isLoaded && isSignedIn && stats.totalComics > 0 && (
        <div className="mb-8">
          <div className="bg-vintage-blue border-4 border-vintage-ink shadow-vintage p-6 text-white relative overflow-hidden">
            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-vintage-yellow" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="font-mono text-sm opacity-75 uppercase tracking-wider mb-1">Collection Value</h2>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl md:text-6xl">
                    ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {stats.unpricedCount > 0 && (
                    <span className="font-mono text-sm opacity-75">
                      ({stats.unpricedCount} unpriced)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="font-display text-4xl">{stats.totalComics}</p>
                  <p className="font-mono text-xs opacity-75 uppercase tracking-wider">Comics</p>
                </div>
                <div className="h-12 w-1 bg-white/30" />
                <Link
                  href="/collection"
                  className="btn-vintage bg-vintage-yellow text-vintage-ink inline-flex items-center gap-2 px-4 py-2"
                >
                  <BookOpen className="w-5 h-5" />
                  View Collection
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards - Vintage Newsprint */}
      {stats.totalComics > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          <div className="comic-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-vintage-blue border-2 border-vintage-ink">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-mono text-xs text-vintage-inkFaded uppercase tracking-wider">Comics</p>
                <p className="font-display text-2xl text-vintage-ink">
                  {stats.totalComics}
                </p>
              </div>
            </div>
          </div>

          <div className="comic-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-vintage-blue border-2 border-vintage-ink">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-mono text-xs text-vintage-inkFaded uppercase tracking-wider">Total Cost</p>
                <p className="font-display text-xl text-vintage-ink">
                  ${stats.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="comic-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 border-2 border-vintage-ink">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-mono text-xs text-vintage-inkFaded uppercase tracking-wider">Est. Value</p>
                <p className="font-display text-xl text-vintage-ink">
                  ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="comic-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-vintage-yellow border-2 border-vintage-ink">
                <Receipt className="w-5 h-5 text-vintage-ink" />
              </div>
              <div>
                <p className="font-mono text-xs text-vintage-inkFaded uppercase tracking-wider">Sales ({salesStats.totalSales})</p>
                <p className="font-display text-xl text-vintage-ink">
                  ${salesStats.totalRevenue.toFixed(2)}
                </p>
                {salesStats.totalProfit !== 0 && (
                  <p className={`font-mono text-xs ${salesStats.totalProfit >= 0 ? 'text-green-600' : 'text-vintage-red'}`}>
                    {salesStats.totalProfit >= 0 ? '+' : ''}${salesStats.totalProfit.toFixed(2)} profit
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="comic-card p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 border-2 border-vintage-ink ${profitLoss >= 0 ? 'bg-green-600' : 'bg-vintage-red'}`}>
                {profitLoss >= 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-white" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <p className="font-mono text-xs text-vintage-inkFaded uppercase tracking-wider">Profit/Loss</p>
                <p className={`font-display text-xl ${profitLoss >= 0 ? 'text-green-600' : 'text-vintage-red'}`}>
                  {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)}
                </p>
                {stats.totalCost > 0 && (
                  <p className={`font-mono text-xs ${profitLoss >= 0 ? 'text-green-600' : 'text-vintage-red'}`}>
                    {profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professor's Hottest Books - Vintage Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-vintage-red border-3 border-vintage-ink shadow-vintage-sm">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-display text-2xl text-vintage-ink uppercase tracking-wide">
                Professor&apos;s Hottest Books
              </h2>
              <p className="font-mono text-xs text-vintage-inkFaded uppercase tracking-wider">
                Weekly market analysis of the most in-demand comics
              </p>
            </div>
          </div>
          <Link
            href="/hottest-books"
            className="font-display text-sm text-vintage-red hover:text-vintage-redDark flex items-center gap-1 uppercase tracking-wide"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {hotBooksLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-vintage-red" />
          </div>
        ) : hotBooksError ? (
          <div className="text-center py-8">
            <p className="font-serif text-vintage-inkFaded mb-2">{hotBooksError}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 font-display text-sm text-vintage-red hover:text-vintage-redDark uppercase"
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
                className="comic-card p-4 group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-vintage-red border-2 border-vintage-ink flex items-center justify-center text-white font-display text-lg flex-shrink-0 shadow-vintage-sm">
                    {book.rank}
                  </div>
                  {book.coverImageUrl && (
                    <img
                      src={book.coverImageUrl}
                      alt={`${book.title} #${book.issueNumber}`}
                      className="w-12 h-18 object-cover border-2 border-vintage-ink"
                    />
                  )}
                </div>
                <h3 className="font-display text-sm text-vintage-ink uppercase leading-tight mb-1">
                  {book.title} #{book.issueNumber}
                </h3>
                <p className="font-mono text-xs text-vintage-inkFaded mb-2 uppercase">
                  {book.publisher}
                </p>
                <div className="price-tag inline-flex items-center gap-1 text-sm">
                  <DollarSign className="w-3 h-3" />
                  <span className="font-display">{formatCurrency(book.priceRange.mid)}</span>
                  <span className="font-mono text-xs">mid</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recently Viewed - Vintage Style */}
      {recentlyViewed.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-vintage-ink uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-5 h-5 text-vintage-inkFaded" />
              Recently Viewed
            </h2>
            <Link
              href="/collection"
              className="font-display text-sm text-vintage-red hover:text-vintage-redDark flex items-center gap-1 uppercase tracking-wide"
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
                className="comic-card overflow-hidden cursor-pointer"
              >
                <div className="aspect-[2/3] bg-vintage-aged relative">
                  {item.coverImageUrl ? (
                    <img
                      src={item.coverImageUrl}
                      alt={`${item.comic.title} #${item.comic.issueNumber}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-vintage-ink text-3xl">
                      <span className="text-vintage-yellow font-display drop-shadow-lg">?</span>
                    </div>
                  )}
                  {item.comic.priceData?.estimatedValue && (
                    <div className="absolute bottom-2 right-2">
                      <span className="price-tag text-xs">
                        ${item.comic.priceData.estimatedValue.toFixed(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-2 bg-vintage-cream">
                  <p className="font-display text-sm text-vintage-ink truncate uppercase">
                    {item.comic.title}
                  </p>
                  <p className="font-mono text-xs text-vintage-inkFaded">
                    #{item.comic.issueNumber}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals - Vintage Style */}
      {/* Biggest Increase Modal */}
      {showBiggestIncrease && biggestIncrease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-vintage-ink/70"
            onClick={() => setShowBiggestIncrease(false)}
          />
          <div className="relative bg-vintage-cream border-4 border-vintage-ink shadow-vintage-lg max-w-sm w-full p-6">
            <button
              onClick={() => setShowBiggestIncrease(false)}
              className="absolute top-4 right-4 p-1 hover:bg-vintage-aged"
            >
              <X className="w-5 h-5 text-vintage-ink" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-green-600 border-2 border-vintage-ink">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-display text-xl text-vintage-ink uppercase">Biggest Increase</h3>
            </div>

            <div className="flex gap-2 mb-4">
              {([30, 60, 90] as DurationDays[]).map((days) => (
                <button
                  key={days}
                  onClick={() => setIncreaseDuration(days)}
                  className={`px-3 py-1 font-display text-sm uppercase transition-colors border-2 border-vintage-ink ${
                    increaseDuration === days
                      ? "bg-green-600 text-white"
                      : "bg-vintage-paper text-vintage-ink hover:bg-vintage-aged"
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>

            <div className="flex gap-4 mb-4">
              {biggestIncrease.item.coverImageUrl && (
                <img
                  src={biggestIncrease.item.coverImageUrl}
                  alt=""
                  className="w-24 h-36 object-cover border-3 border-vintage-ink shadow-vintage"
                />
              )}
              <div>
                <h4 className="font-display text-vintage-ink uppercase">
                  {biggestIncrease.item.comic.title}
                </h4>
                <p className="font-mono text-sm text-vintage-inkFaded mb-3">
                  #{biggestIncrease.item.comic.issueNumber}
                </p>
                <div className="space-y-1">
                  <p className="font-display text-3xl text-green-600">
                    +${biggestIncrease.change.toFixed(2)}
                  </p>
                  <p className="font-mono text-sm text-green-600">
                    +{biggestIncrease.changePercent.toFixed(1)}%
                  </p>
                  <p className="font-mono text-xs text-vintage-inkFaded">
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
            className="absolute inset-0 bg-vintage-ink/70"
            onClick={() => setShowBestBuy(false)}
          />
          <div className="relative bg-vintage-cream border-4 border-vintage-ink shadow-vintage-lg max-w-sm w-full p-6">
            <button
              onClick={() => setShowBestBuy(false)}
              className="absolute top-4 right-4 p-1 hover:bg-vintage-aged"
            >
              <X className="w-5 h-5 text-vintage-ink" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-vintage-blue border-2 border-vintage-ink">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-display text-xl text-vintage-ink uppercase">Best Buy</h3>
            </div>

            <p className="font-serif text-sm text-vintage-inkSoft mb-4 italic">
              Highest ROI based on purchase price
            </p>

            <div className="flex gap-4 mb-4">
              {bestBuy.item.coverImageUrl && (
                <img
                  src={bestBuy.item.coverImageUrl}
                  alt=""
                  className="w-24 h-36 object-cover border-3 border-vintage-ink shadow-vintage"
                />
              )}
              <div>
                <h4 className="font-display text-vintage-ink uppercase">
                  {bestBuy.item.comic.title}
                </h4>
                <p className="font-mono text-sm text-vintage-inkFaded mb-3">
                  #{bestBuy.item.comic.issueNumber}
                </p>
                <div className="space-y-1">
                  <p className="font-display text-3xl text-vintage-blue">
                    +{bestBuy.roi.toFixed(0)}% ROI
                  </p>
                  <div className="font-mono text-xs text-vintage-inkFaded space-y-0.5">
                    <p>Paid: ${bestBuy.purchasePrice.toFixed(2)}</p>
                    <p>Value: ${bestBuy.currentValue.toFixed(2)}</p>
                    <p className="text-green-600 font-bold">
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
            className="absolute inset-0 bg-vintage-ink/70"
            onClick={() => setShowBiggestDecline(false)}
          />
          <div className="relative bg-vintage-cream border-4 border-vintage-ink shadow-vintage-lg max-w-sm w-full p-6">
            <button
              onClick={() => setShowBiggestDecline(false)}
              className="absolute top-4 right-4 p-1 hover:bg-vintage-aged"
            >
              <X className="w-5 h-5 text-vintage-ink" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-vintage-red border-2 border-vintage-ink">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-display text-xl text-vintage-ink uppercase">Biggest Decline</h3>
            </div>

            <div className="flex gap-2 mb-4">
              {([30, 60, 90] as DurationDays[]).map((days) => (
                <button
                  key={days}
                  onClick={() => setDeclineDuration(days)}
                  className={`px-3 py-1 font-display text-sm uppercase transition-colors border-2 border-vintage-ink ${
                    declineDuration === days
                      ? "bg-vintage-red text-white"
                      : "bg-vintage-paper text-vintage-ink hover:bg-vintage-aged"
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>

            <div className="flex gap-4 mb-4">
              {biggestDecline.item.coverImageUrl && (
                <img
                  src={biggestDecline.item.coverImageUrl}
                  alt=""
                  className="w-24 h-36 object-cover border-3 border-vintage-ink shadow-vintage"
                />
              )}
              <div>
                <h4 className="font-display text-vintage-ink uppercase">
                  {biggestDecline.item.comic.title}
                </h4>
                <p className="font-mono text-sm text-vintage-inkFaded mb-3">
                  #{biggestDecline.item.comic.issueNumber}
                </p>
                <div className="space-y-1">
                  <p className="font-display text-3xl text-vintage-red">
                    ${biggestDecline.change.toFixed(2)}
                  </p>
                  <p className="font-mono text-sm text-vintage-red">
                    {biggestDecline.changePercent.toFixed(1)}%
                  </p>
                  <p className="font-mono text-xs text-vintage-inkFaded">
                    Current: ${biggestDecline.currentValue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer - Vintage Style */}
      <footer className="mt-16 pt-8 border-t-4 border-vintage-ink">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-sm text-vintage-inkFaded uppercase tracking-wider">
          <p>&copy; {new Date().getFullYear()} Collectors Chest. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-vintage-ink transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-vintage-ink transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
