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

  // High value threshold (comics worth $100+)
  const isHighValue = estimatedValue >= 100;

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
      className={`comic-card comic-card-notch bg-cc-cream rounded-xl overflow-hidden cursor-pointer group border border-cc-ink/5 ${
        isHighValue ? "high-value-indicator" : ""
      }`}
    >
      {/* Cover Image */}
      <div className="relative aspect-[2/3] bg-cc-ink/5">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={`${comic.title} #${comic.issueNumber}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-cc-ink">
            <span className="text-4xl font-display text-cc-scanner drop-shadow-[0_0_12px_rgba(0,212,255,0.6)]">?</span>
          </div>
        )}

        {/* Badges - Top Left */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {forSale && (
            <span className="badge-for-sale px-2 py-1 text-xs font-bold rounded flex items-center gap-1 shadow-retro-sm">
              <Tag className="w-3 h-3" />
              For Sale
            </span>
          )}
          {conditionLabel && (
            <span className="badge-condition px-2 py-1 text-[10px] font-bold rounded shadow-sm">
              {conditionLabel}
            </span>
          )}
        </div>

        {/* Quick Actions - Show on hover */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
          {onToggleStar && (
            <button
              onClick={handleStarClick}
              className={`p-2 rounded-lg transition-all duration-200 shadow-md ${
                item.isStarred
                  ? "bg-cc-gold text-cc-ink shadow-gold"
                  : "bg-cc-cream/95 text-cc-ink/60 hover:bg-cc-gold/20 hover:text-cc-gold"
              }`}
              title={item.isStarred ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={`w-4 h-4 ${item.isStarred ? "fill-current" : ""}`} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={handleEditClick}
              className="p-2 bg-cc-cream/95 text-cc-ink/60 rounded-lg hover:bg-cc-scanner/20 hover:text-cc-scanner transition-all duration-200 shadow-md"
              title="Edit details"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Price/Profit Badge - Bottom Right */}
        <div className="absolute bottom-2 right-2 flex flex-col gap-1.5 items-end">
          {estimatedValue > 0 && (
            <span className="badge-price px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-cc-gold" />
              <span className="font-mono">{estimatedValue.toFixed(0)}</span>
            </span>
          )}
          {hasProfitData && (
            <span className={`px-2 py-0.5 text-xs font-bold rounded flex items-center gap-0.5 font-mono ${
              profitLoss >= 0
                ? "bg-cc-mint text-cc-ink"
                : "bg-cc-red text-white"
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

        {/* Hover Overlay with subtle scanner effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-cc-ink/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Info Section */}
      <div className="p-3 border-t border-cc-ink/5">
        <h3 className="font-display text-lg text-cc-ink truncate tracking-wide">
          {comic.title || "Unknown Title"}
        </h3>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm text-cc-ink/70 font-mono">
            #{comic.issueNumber || "?"}
            {comic.variant && (
              <span className="text-cc-ink/40 ml-1 font-sans text-xs">({comic.variant})</span>
            )}
          </p>
          {item.isStarred && (
            <Star className="w-4 h-4 text-cc-gold fill-cc-gold" />
          )}
        </div>
        <p className="text-xs text-cc-ink/50 mt-1 truncate">
          {comic.publisher || "Unknown Publisher"}
          {comic.releaseYear && ` • ${comic.releaseYear}`}
        </p>
      </div>
    </div>
  );
}
