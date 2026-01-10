"use client";

import { useState, useMemo } from "react";
import { Search, Clock, DollarSign, Database } from "lucide-react";
import { CachedLookup, getAllCachedLookups, searchCachedLookups } from "@/lib/offlineCache";

interface KeyHuntOfflineSearchProps {
  onSelectResult: (result: CachedLookup["data"]) => void;
}

export function KeyHuntOfflineSearch({ onSelectResult }: KeyHuntOfflineSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const allCached = useMemo(() => getAllCachedLookups(), []);
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return allCached;
    return searchCachedLookups(searchQuery);
  }, [searchQuery, allCached]);

  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A";
    return `$${price.toFixed(2)}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (allCached.length === 0) {
    return (
      <div className="p-6 text-center">
        <Database className="w-12 h-12 text-gray-500 mx-auto mb-3" />
        <p className="text-white font-medium mb-1">No Cached Results</p>
        <p className="text-gray-400 text-sm">
          Previous lookups will appear here when offline
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cached comics..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {searchResults.length} of {allCached.length} cached lookups
        </p>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto">
        {searchResults.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-400 text-sm">No matching results</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {searchResults.map((item) => (
              <button
                key={item.key}
                onClick={() => onSelectResult(item.data)}
                className="w-full p-4 text-left hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {item.data.title} #{item.data.issueNumber}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {item.data.publisher && (
                        <span className="text-xs text-gray-400">
                          {item.data.publisher}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        Grade: {item.data.grade}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-green-400">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span className="font-semibold">
                        {formatPrice(item.data.averagePrice)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(item.lastAccessed)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
