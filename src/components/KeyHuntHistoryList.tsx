"use client";

import { useEffect, useState } from "react";

import { AlertCircle, ChevronRight, Clock, DollarSign, Trash2, X } from "lucide-react";

import { KeyHuntHistoryEntry, clearKeyHuntHistory, getKeyHuntHistory } from "@/lib/offlineCache";

import { ComicImage } from "./ComicImage";

interface KeyHuntHistoryListProps {
  onSelectEntry: (entry: KeyHuntHistoryEntry) => void;
  onClose: () => void;
}

export function KeyHuntHistoryList({ onSelectEntry, onClose }: KeyHuntHistoryListProps) {
  const [entries, setEntries] = useState<KeyHuntHistoryEntry[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load entries on mount
  useEffect(() => {
    setEntries(getKeyHuntHistory());
  }, []);

  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A";
    return `$${price.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatGrade = (grade: number) => {
    return grade.toFixed(1);
  };

  const handleClearHistory = () => {
    clearKeyHuntHistory();
    setEntries([]);
    setShowClearConfirm(false);
  };

  if (entries.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Scan History</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No History Yet</p>
            <p className="text-gray-400 text-sm">Your recent price lookups will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-white">Scan History</h2>
          <p className="text-xs text-gray-400">{entries.length} recent lookups</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <Trash2 className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Clear Confirmation */}
      {showClearConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
          <div className="mx-4 p-6 bg-gray-800 rounded-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Clear History?</h3>
                <p className="text-sm text-gray-400">This cannot be undone</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-700/50">
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              className="w-full p-4 text-left hover:bg-gray-800/50 transition-colors active:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                {/* Cover Thumbnail */}
                <div className="w-14 h-20 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                  {entry.coverImageUrl ? (
                    <ComicImage
                      src={entry.coverImageUrl}
                      alt={`${entry.title} #${entry.issueNumber}`}
                      aspectRatio="fill"
                      sizes="56px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl text-gray-500 font-bold">
                        {entry.title.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{entry.title}</p>
                  <p className="text-sm text-gray-400">
                    #{entry.issueNumber}
                    {entry.variant && <span className="text-gray-500"> - {entry.variant}</span>}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                      {formatGrade(entry.grade)}
                    </span>
                    {entry.isSlabbed && (
                      <span className="px-2 py-0.5 bg-amber-500/20 rounded text-xs text-amber-400">
                        Slabbed
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Price & Arrow */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-400 font-semibold">
                      <DollarSign className="w-4 h-4" />
                      {formatPrice(entry.priceResult.rawPrice)}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/50">
        <p className="text-xs text-gray-500 text-center">
          Tap an entry to view details or lookup again
        </p>
      </div>
    </div>
  );
}
