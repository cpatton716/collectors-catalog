"use client";

import { useState } from "react";

import { Heart } from "lucide-react";

interface WatchlistButtonProps {
  auctionId: string;
  isWatching: boolean;
  onToggle?: (auctionId: string, isWatching: boolean) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function WatchlistButton({
  auctionId,
  isWatching: initialWatching,
  onToggle,
  size = "md",
  className = "",
}: WatchlistButtonProps) {
  const [isWatching, setIsWatching] = useState(initialWatching);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    try {
      const method = isWatching ? "DELETE" : "POST";
      const response = await fetch("/api/watchlist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auctionId }),
      });

      if (response.ok) {
        const newState = !isWatching;
        setIsWatching(newState);
        onToggle?.(auctionId, newState);
      }
    } catch (error) {
      console.error("Error toggling watchlist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`rounded-full transition-all duration-200 ${sizeClasses[size]} ${
        isWatching
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-white/90 text-gray-600 hover:bg-red-50 hover:text-red-500"
      } ${isLoading ? "opacity-50 cursor-wait" : ""} ${className}`}
      title={isWatching ? "Remove from watchlist" : "Add to watchlist"}
    >
      <Heart className={`${iconSizes[size]} ${isWatching ? "fill-current" : ""}`} />
    </button>
  );
}
