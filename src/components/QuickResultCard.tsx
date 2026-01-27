"use client";

import { useState } from "react";

import Image from "next/image";

import { BookPlus, Check, Heart, Loader2, X } from "lucide-react";

import { ComicDetails, GradeEstimate } from "@/types/comic";

interface QuickResultCardProps {
  comic: ComicDetails;
  coverImageUrl: string | null;
  onAddToList: (listId: string) => Promise<void>;
  onClose: () => void;
}

// All standard CGC/CBCS grades
const ALL_GRADES = [
  10, 9.9, 9.8, 9.6, 9.4, 9.2, 9.0, 8.5, 8.0, 7.5, 7.0, 6.5, 6.0, 5.5, 5.0, 4.5, 4.0, 3.5, 3.0, 2.5,
  2.0, 1.8, 1.5, 1.0, 0.5,
];

export function QuickResultCard({
  comic,
  coverImageUrl,
  onAddToList,
  onClose,
}: QuickResultCardProps) {
  // If comic is slabbed with a detected grade, use that grade
  const detectedGrade = comic.isSlabbed && comic.grade ? parseFloat(comic.grade) : null;
  const [selectedGrade, setSelectedGrade] = useState<number>(detectedGrade || 9.4);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<string[]>([]);

  const gradeEstimates = comic.priceData?.gradeEstimates || [];
  const isSlabbed = comic.isSlabbed && detectedGrade !== null;

  // Get price for selected grade
  const getPrice = (grade: number, slabbed: boolean): number | null => {
    const estimate = gradeEstimates.find((e) => e.grade === grade);
    if (estimate) {
      return slabbed ? estimate.slabbedValue : estimate.rawValue;
    }
    // Fallback to base estimated value
    if (grade === 9.4 && comic.priceData?.estimatedValue) {
      return comic.priceData.estimatedValue;
    }
    return null;
  };

  const rawPrice = getPrice(selectedGrade, false);
  const slabbedPrice = getPrice(selectedGrade, true);

  const handleAddToList = async (listId: string) => {
    if (addingTo || addedTo.includes(listId)) return;
    setAddingTo(listId);
    try {
      await onAddToList(listId);
      setAddedTo((prev) => [...prev, listId]);
    } finally {
      setAddingTo(null);
    }
  };

  const formatPrice = (price: number | null): string => {
    if (price === null) return "N/A";
    return `$${price.toLocaleString()}`;
  };

  const quickActions = [
    { id: "want-list", label: "Want", icon: Heart, color: "bg-pink-500 hover:bg-pink-600" },
    {
      id: "collection",
      label: "Collection",
      icon: BookPlus,
      color: "bg-primary-500 hover:bg-primary-600",
    },
    { id: "passed-on", label: "Pass", icon: X, color: "bg-gray-500 hover:bg-gray-600" },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-sm w-full mx-auto">
      {/* Header with close button */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <h2 className="font-semibold truncate flex-1">
          {comic.title || "Unknown Title"} #{comic.issueNumber || "?"}
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-full transition-colors ml-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Comic info */}
      <div className="p-4 flex gap-4">
        {/* Cover image */}
        <div className="w-24 h-36 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={`${comic.title} #${comic.issueNumber} cover`}
              width={96}
              height={144}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-2">
              No Cover
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-600">
            {comic.publisher || "Unknown Publisher"}
            {comic.releaseYear && ` (${comic.releaseYear})`}
          </p>
          {comic.variant && <p className="text-xs text-gray-500 mt-1 truncate">{comic.variant}</p>}

          {/* Key info */}
          {comic.keyInfo && comic.keyInfo.length > 0 && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-medium text-amber-800">Key Issue</p>
              <p className="text-xs text-amber-700 line-clamp-2">{comic.keyInfo.join(", ")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Grade section - different display for slabbed vs raw */}
      {isSlabbed ? (
        /* Slabbed comic - show detected grade, no selector */
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold">
              {detectedGrade?.toFixed(1)}
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">
                {comic.gradingCompany || "CGC"} Graded
              </p>
              <p className="text-xs text-blue-700">Grade detected from scan</p>
            </div>
          </div>
        </div>
      ) : (
        /* Raw comic - show grade selector */
        <div className="px-4 pb-3">
          <p className="text-xs font-medium text-gray-500 mb-2">Select Grade</p>
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {ALL_GRADES.map((grade) => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`flex-shrink-0 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedGrade === grade
                    ? "bg-primary-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {grade.toFixed(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price display */}
      <div className="px-4 pb-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs font-medium text-green-700 mb-2">
            Estimated Value ({selectedGrade.toFixed(1)} grade)
          </p>
          {isSlabbed ? (
            /* Slabbed - show only slabbed price */
            <div>
              <p className="text-xs text-gray-500">{comic.gradingCompany || "CGC"} Slabbed</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(slabbedPrice)}</p>
            </div>
          ) : (
            /* Raw - show both raw and slabbed prices */
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Raw</p>
                <p className="text-xl font-bold text-gray-900">{formatPrice(rawPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Slabbed</p>
                <p className="text-xl font-bold text-gray-900">{formatPrice(slabbedPrice)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="px-4 pb-4 grid grid-cols-3 gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const isAdding = addingTo === action.id;
          const isAdded = addedTo.includes(action.id);

          return (
            <button
              key={action.id}
              onClick={() => handleAddToList(action.id)}
              disabled={isAdding || isAdded}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl text-white font-medium transition-all ${
                isAdded ? "bg-green-500" : isAdding ? "bg-gray-400" : action.color
              }`}
            >
              {isAdding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isAdded ? (
                <Check className="w-5 h-5" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
              <span className="text-xs">{isAdded ? "Added" : action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
