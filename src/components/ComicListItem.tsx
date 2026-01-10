"use client";

import { CollectionItem } from "@/types/comic";
import { Tag, DollarSign, ChevronRight, Star } from "lucide-react";

interface ComicListItemProps {
  item: CollectionItem;
  onClick?: () => void;
}

export function ComicListItem({ item, onClick }: ComicListItemProps) {
  const { comic, coverImageUrl, conditionLabel, conditionGrade, forSale, askingPrice, averagePrice, dateAdded } = item;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center gap-4">
        {/* Thumbnail */}
        <div className="w-16 h-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={`${comic.title} #${comic.issueNumber}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-2xl">
              <span className="text-green-400 font-bold italic drop-shadow-[0_0_6px_rgba(74,222,128,0.6)]">?</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {comic.title || "Unknown Title"}
                {item.isStarred && (
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                )}
              </h3>
              <p className="text-sm text-gray-600">
                Issue #{comic.issueNumber || "?"}
                {comic.variant && (
                  <span className="text-gray-400"> • {comic.variant}</span>
                )}
              </p>
            </div>

            {/* Price */}
            <div className="text-right">
              {(askingPrice || averagePrice) && (
                <p className="font-bold text-gray-900 flex items-center justify-end gap-1">
                  <DollarSign className="w-4 h-4" />
                  {(askingPrice || averagePrice)?.toFixed(2)}
                </p>
              )}
              {forSale && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full mt-1">
                  <Tag className="w-3 h-3" />
                  For Sale
                </span>
              )}
            </div>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{comic.publisher || "Unknown Publisher"}</span>
            {comic.releaseYear && <span>{comic.releaseYear}</span>}
            {conditionLabel && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {conditionLabel}
                {conditionGrade && ` (${conditionGrade})`}
              </span>
            )}
            <span>Added {new Date(dateAdded).toLocaleDateString()}</span>
          </div>

          {/* Creative Team */}
          {(comic.writer || comic.coverArtist) && (
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
              {comic.writer && <span>Writer: {comic.writer}</span>}
              {comic.coverArtist && <span>Cover: {comic.coverArtist}</span>}
            </div>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
    </div>
  );
}
