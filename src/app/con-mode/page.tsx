"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Zap, ScanBarcode, History, AlertCircle } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { QuickResultCard } from "@/components/QuickResultCard";
import { ComicDetails, CollectionItem } from "@/types/comic";
import { storage } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";

// Cache key for recent Con Mode scans
const CON_MODE_CACHE_KEY = "con_mode_cache";
const CON_MODE_HISTORY_KEY = "con_mode_history";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedComic {
  comic: ComicDetails;
  coverImageUrl: string | null;
  timestamp: number;
}

interface RecentScan {
  id: string;
  title: string;
  issueNumber: string | null;
  price: number | null;
  timestamp: number;
}

type ConModeState = "idle" | "scanning" | "loading" | "result" | "error";

export default function ConModePage() {
  const { isSignedIn } = useUser();
  const [state, setState] = useState<ConModeState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentComic, setCurrentComic] = useState<ComicDetails | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  // Load recent scans on mount
  useEffect(() => {
    const history = localStorage.getItem(CON_MODE_HISTORY_KEY);
    if (history) {
      try {
        const parsed = JSON.parse(history) as RecentScan[];
        // Filter out old entries (older than 7 days)
        const recent = parsed.filter(
          (scan) => Date.now() - scan.timestamp < CACHE_TTL
        );
        setRecentScans(recent.slice(0, 10));
      } catch {
        // Invalid cache, ignore
      }
    }
  }, []);

  // Save scan to history
  const saveToHistory = useCallback((comic: ComicDetails) => {
    const newScan: RecentScan = {
      id: uuidv4(),
      title: comic.title || "Unknown",
      issueNumber: comic.issueNumber,
      price: comic.priceData?.estimatedValue || null,
      timestamp: Date.now(),
    };

    setRecentScans((prev) => {
      const updated = [newScan, ...prev.filter((s) =>
        !(s.title === newScan.title && s.issueNumber === newScan.issueNumber)
      )].slice(0, 10);
      localStorage.setItem(CON_MODE_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Check cache for barcode
  const checkCache = useCallback((barcode: string): CachedComic | null => {
    const cache = localStorage.getItem(CON_MODE_CACHE_KEY);
    if (!cache) return null;

    try {
      const parsed = JSON.parse(cache) as Record<string, CachedComic>;
      const cached = parsed[barcode];
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached;
      }
    } catch {
      // Invalid cache
    }
    return null;
  }, []);

  // Save to cache
  const saveToCache = useCallback((barcode: string, comic: ComicDetails, coverUrl: string | null) => {
    const cache = localStorage.getItem(CON_MODE_CACHE_KEY);
    let parsed: Record<string, CachedComic> = {};

    try {
      if (cache) {
        parsed = JSON.parse(cache);
      }
    } catch {
      // Start fresh
    }

    // Clean old entries
    const now = Date.now();
    Object.keys(parsed).forEach((key) => {
      if (now - parsed[key].timestamp > CACHE_TTL) {
        delete parsed[key];
      }
    });

    // Add new entry
    parsed[barcode] = {
      comic,
      coverImageUrl: coverUrl,
      timestamp: now,
    };

    // Keep only last 20 entries
    const entries = Object.entries(parsed);
    if (entries.length > 20) {
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      parsed = Object.fromEntries(entries.slice(0, 20));
    }

    localStorage.setItem(CON_MODE_CACHE_KEY, JSON.stringify(parsed));
  }, []);

  // Handle barcode scan
  const handleScan = useCallback(async (barcode: string) => {
    setState("loading");
    setError(null);

    // Check cache first
    const cached = checkCache(barcode);
    if (cached) {
      setCurrentComic(cached.comic);
      setCoverImageUrl(cached.coverImageUrl);
      saveToHistory(cached.comic);
      setState("result");
      return;
    }

    try {
      const response = await fetch("/api/quick-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to look up comic");
      }

      const data = await response.json();
      setCurrentComic(data.comic);
      setCoverImageUrl(data.coverImageUrl);
      saveToCache(barcode, data.comic, data.coverImageUrl);
      saveToHistory(data.comic);
      setState("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to look up comic");
      setState("error");
    }
  }, [checkCache, saveToCache, saveToHistory]);

  // Handle adding to a list
  const handleAddToList = useCallback(async (listId: string) => {
    if (!currentComic) return;

    // Create a CollectionItem from the comic
    const item: CollectionItem = {
      id: uuidv4(),
      comic: currentComic,
      coverImageUrl: coverImageUrl || "",
      conditionGrade: null,
      conditionLabel: null,
      isGraded: false,
      gradingCompany: null,
      purchasePrice: null,
      purchaseDate: null,
      notes: "Added from Con Mode",
      forSale: false,
      askingPrice: null,
      averagePrice: currentComic.priceData?.estimatedValue || null,
      dateAdded: new Date().toISOString(),
      listIds: listId === "collection" ? [] : [listId],
      isStarred: false,
    };

    // Add to collection (localStorage for now, will sync if signed in)
    storage.addToCollection(item);

    // If adding to a specific list (not just collection), also add to that list
    if (listId !== "collection") {
      storage.addItemToList(item.id, listId);
    }
  }, [currentComic, coverImageUrl]);

  // Format price for display
  const formatPrice = (price: number | null): string => {
    if (price === null) return "—";
    return `$${price.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary-600 to-primary-700 px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Con Mode</h1>
            <p className="text-sm text-white/80">Quick Price Lookup</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4">
        {/* Idle state - show recent scans and scan button */}
        {state === "idle" && (
          <>
            {/* Recent scans */}
            {recentScans.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-medium text-gray-400">Recent Scans</h2>
                </div>
                <div className="space-y-2">
                  {recentScans.map((scan) => (
                    <div
                      key={scan.id}
                      className="bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {scan.title}
                          {scan.issueNumber && ` #${scan.issueNumber}`}
                        </p>
                      </div>
                      <p className="text-green-400 font-semibold ml-4">
                        {formatPrice(scan.price)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {recentScans.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ScanBarcode className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-gray-400 mb-2">No recent scans</p>
                <p className="text-sm text-gray-500">
                  Scan a barcode to get instant pricing
                </p>
              </div>
            )}

            {/* Scan button */}
            <button
              onClick={() => setState("scanning")}
              className="fixed bottom-24 left-4 right-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg transition-colors"
            >
              <ScanBarcode className="w-6 h-6" />
              Scan Barcode
            </button>
          </>
        )}

        {/* Scanning state */}
        {state === "scanning" && (
          <BarcodeScanner
            onScan={handleScan}
            onClose={() => setState("idle")}
            isProcessing={false}
          />
        )}

        {/* Loading state */}
        {state === "loading" && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Looking up comic...</p>
              <p className="text-sm text-gray-400 mt-2">Getting price info</p>
            </div>
          </div>
        )}

        {/* Result state */}
        {state === "result" && currentComic && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
            <QuickResultCard
              comic={currentComic}
              coverImageUrl={coverImageUrl}
              onAddToList={handleAddToList}
              onClose={() => {
                setState("idle");
                setCurrentComic(null);
                setCoverImageUrl(null);
              }}
            />
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Lookup Failed</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setState("scanning")}
                  className="flex-1 bg-primary-500 text-white py-3 rounded-xl font-medium hover:bg-primary-600 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    setState("idle");
                    setError(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Not signed in notice */}
      {!isSignedIn && state === "idle" && (
        <div className="fixed bottom-36 left-4 right-4 bg-amber-500/20 border border-amber-500/30 rounded-lg px-4 py-3">
          <p className="text-amber-200 text-sm text-center">
            Sign in to sync your scans across devices
          </p>
        </div>
      )}
    </div>
  );
}
