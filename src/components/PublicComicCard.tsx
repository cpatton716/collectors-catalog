"use client";

import { CollectionItem } from "@/types/comic";
import { DollarSign, Award } from "lucide-react";

interface PublicComicCardProps {
  item: CollectionItem;
  onClick?: () => void;
}

export function PublicComicCard({ item, onClick }: PublicComicCardProps) {
  const { comic, coverImageUrl, conditionLabel } = item;
  const estimatedValue = comic.priceData?.estimatedValue || 0;

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
          {comic.isSlabbed && (
            <span className="px-2 py-1 bg-purple-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
              <Award className="w-3 h-3" />
              {comic.gradingCompany} {comic.grade}
            </span>
          )}
          {!comic.isSlabbed && conditionLabel && (
            <span className="px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full">
              {conditionLabel}
            </span>
          )}
        </div>

        {/* Price Badge */}
        {estimatedValue > 0 && (
          <div className="absolute bottom-2 right-2">
            <span className="px-2 py-1 bg-black/70 text-white text-xs font-bold rounded-lg flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {estimatedValue.toFixed(0)}
            </span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 pointer-events-none" />
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 truncate">
          {comic.title || "Unknown Title"}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          #{comic.issueNumber || "?"}
          {comic.variant && (
            <span className="text-gray-400 ml-1">({comic.variant})</span>
          )}
        </p>
        <p className="text-xs text-gray-500 mt-1 truncate">
          {comic.publisher || "Unknown Publisher"}
          {comic.releaseYear && ` - ${comic.releaseYear}`}
        </p>
      </div>
    </div>
  );
}
