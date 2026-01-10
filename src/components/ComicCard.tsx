"use client";

import { CollectionItem } from "@/types/comic";
import { Tag, DollarSign, Star, TrendingUp, TrendingDown, Pencil } from "lucide-react";

interface ComicCardProps {
  item: CollectionItem;
  onClick?: () => void;
  onToggleStar?: (id: string) => void;
  onEdit?: (item: CollectionItem) => void;
}

export function ComicCard({ item, onClick, onToggleStar, onEdit }: ComicCardProps) {
  const { comic, coverImageUrl, conditionLabel, forSale, askingPrice } = item;

  // Calculate profit/loss
  const estimatedValue = comic.priceData?.estimatedValue || 0;
  const purchasePrice = item.purchasePrice || 0;
  const hasProfitData = estimatedValue > 0 && purchasePrice > 0;
  const profitLoss = hasProfitData ? estimatedValue - purchasePrice : 0;

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar?.(item.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(item);
  };

  return (
    <div
      onClick={onClick}
      className="comic-card bg-white rounded-xl shadow-md overflow-hidden cursor-pointer group"
    >
      {/* Cover Image */}
      <div className="relative aspect-[2/3] bg-gray-100">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={`${comic.title} #${comic.issueNumber}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900 text-4xl">
              <span className="text-green-400 font-bold italic drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]">?</span>
            </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {forSale && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
              <Tag className="w-3 h-3" />
              For Sale
            </span>
          )}
          {conditionLabel && (
            <span className="px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full">
              {conditionLabel}
            </span>
          )}
        </div>

        {/* Quick Actions - Show on hover */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onToggleStar && (
            <button
              onClick={handleStarClick}
              className={`p-2 rounded-full transition-colors ${
                item.isStarred
                  ? "bg-yellow-500 text-white"
                  : "bg-white/90 text-gray-600 hover:bg-yellow-100 hover:text-yellow-600"
              }`}
              title={item.isStarred ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={`w-4 h-4 ${item.isStarred ? "fill-current" : ""}`} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={handleEditClick}
              className="p-2 bg-white/90 text-gray-600 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"
              title="Edit details"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Price/Profit Badge */}
        <div className="absolute bottom-2 right-2 flex flex-col gap-1 items-end">
          {estimatedValue > 0 && (
            <span className="px-2 py-1 bg-black/70 text-white text-xs font-bold rounded-lg flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {estimatedValue.toFixed(0)}
            </span>
          )}
          {hasProfitData && (
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-lg flex items-center gap-0.5 ${
              profitLoss >= 0
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}>
              {profitLoss >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {profitLoss >= 0 ? "+" : ""}${profitLoss.toFixed(0)}
            </span>
          )}
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 pointer-events-none" />
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 truncate">
          {comic.title || "Unknown Title"}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-gray-600">
            #{comic.issueNumber || "?"}
            {comic.variant && (
              <span className="text-gray-400 ml-1">({comic.variant})</span>
            )}
          </p>
          {item.isStarred && (
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1 truncate">
          {comic.publisher || "Unknown Publisher"}
          {comic.releaseYear && ` • ${comic.releaseYear}`}
        </p>
      </div>
    </div>
  );
}
