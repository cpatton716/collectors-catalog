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
      className="comic-card overflow-hidden cursor-pointer group"
    >
      {/* Cover Image */}
      <div className="relative aspect-[2/3] bg-vintage-aged">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={`${comic.title} #${comic.issueNumber}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-vintage-ink text-4xl">
            <span className="text-vintage-yellow font-display drop-shadow-lg">?</span>
          </div>
        )}

        {/* Badges - Vintage Style */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {forSale && (
            <span className="badge-vintage badge-yellow flex items-center gap-1">
              <Tag className="w-3 h-3" />
              For Sale
            </span>
          )}
          {conditionLabel && (
            <span className="badge-vintage badge-blue">
              {conditionLabel}
            </span>
          )}
        </div>

        {/* Quick Actions - Show on hover */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onToggleStar && (
            <button
              onClick={handleStarClick}
              className={`p-2 border-2 border-vintage-ink transition-all ${
                item.isStarred
                  ? "bg-vintage-yellow text-vintage-ink shadow-vintage-sm"
                  : "bg-vintage-cream text-vintage-inkFaded hover:bg-vintage-yellow hover:text-vintage-ink"
              }`}
              title={item.isStarred ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={`w-4 h-4 ${item.isStarred ? "fill-current" : ""}`} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={handleEditClick}
              className="p-2 bg-vintage-cream border-2 border-vintage-ink text-vintage-inkFaded hover:bg-vintage-blue hover:text-white transition-all"
              title="Edit details"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Price/Profit Badge - Vintage Price Tag Style */}
        <div className="absolute bottom-2 right-2 flex flex-col gap-1 items-end">
          {estimatedValue > 0 && (
            <span className="price-tag flex items-center gap-1 text-sm">
              <DollarSign className="w-3 h-3" />
              {estimatedValue.toFixed(0)}
            </span>
          )}
          {hasProfitData && (
            <span className={`badge-vintage text-xs flex items-center gap-0.5 ${
              profitLoss >= 0
                ? "bg-green-600 text-white border-green-800"
                : "bg-vintage-red text-white border-vintage-redDark"
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

        {/* Hover Overlay - Slight aging effect */}
        <div className="absolute inset-0 bg-vintage-foxing/0 group-hover:bg-vintage-foxing/10 transition-colors duration-200 pointer-events-none" />
      </div>

      {/* Info */}
      <div className="p-3 bg-vintage-cream">
        <h3 className="font-display text-vintage-ink truncate uppercase tracking-wide">
          {comic.title || "Unknown Title"}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <p className="font-mono text-sm text-vintage-inkSoft">
            #{comic.issueNumber || "?"}
            {comic.variant && (
              <span className="text-vintage-inkFaded ml-1">({comic.variant})</span>
            )}
          </p>
          {item.isStarred && (
            <Star className="w-4 h-4 text-vintage-yellow fill-vintage-yellow" />
          )}
        </div>
        <p className="font-mono text-xs text-vintage-inkFaded mt-1 truncate uppercase tracking-wider">
          {comic.publisher || "Unknown Publisher"}
          {comic.releaseYear && ` • ${comic.releaseYear}`}
        </p>
      </div>
    </div>
  );
}
