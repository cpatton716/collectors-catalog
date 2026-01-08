"use client";

import { useState, useEffect } from "react";
import {
  ComicDetails,
  CollectionItem,
  PUBLISHERS,
  GRADING_COMPANIES,
  GRADE_SCALE,
  GradingCompany,
} from "@/types/comic";
import { AlertCircle, CheckCircle, Loader2, DollarSign, TrendingUp, Info, Search, ExternalLink, Plus, X, KeyRound } from "lucide-react";
import { TitleAutocomplete } from "./TitleAutocomplete";

interface ComicDetailsFormProps {
  comic: ComicDetails;
  coverImageUrl: string;
  onCoverImageChange?: (url: string) => void;
  onSave: (item: Partial<CollectionItem>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: "add" | "edit";
  existingItem?: CollectionItem; // Pass full item for edit mode
}

export function ComicDetailsForm({
  comic: initialComic,
  coverImageUrl,
  onCoverImageChange,
  onSave,
  onCancel,
  isLoading,
  mode = "add",
  existingItem,
}: ComicDetailsFormProps) {
  const [comic, setComic] = useState<ComicDetails>({
    ...initialComic,
    keyInfo: initialComic.keyInfo || [],
  });

  // Grading state - initialized from AI detection or existing item
  const [isGraded, setIsGraded] = useState(existingItem?.isGraded || initialComic.isSlabbed || false);
  const [gradingCompany, setGradingCompany] = useState<GradingCompany | "">(
    (existingItem?.gradingCompany as GradingCompany) || initialComic.gradingCompany || ""
  );
  const [grade, setGrade] = useState(existingItem?.conditionGrade?.toString() || initialComic.grade || "");
  const [isSignatureSeries, setIsSignatureSeries] = useState(
    initialComic.isSignatureSeries || false
  );
  const [signedBy, setSignedBy] = useState(initialComic.signedBy || "");

  // Other form state - initialized from existing item in edit mode
  const [purchasePrice, setPurchasePrice] = useState<string>(
    existingItem?.purchasePrice?.toString() || ""
  );
  const [notes, setNotes] = useState(existingItem?.notes || "");
  const [forSale, setForSale] = useState(existingItem?.forSale || false);
  const [askingPrice, setAskingPrice] = useState<string>(
    existingItem?.askingPrice?.toString() || ""
  );
  const [isSearchingCover, setIsSearchingCover] = useState(false);
  const [coverSearchUrl, setCoverSearchUrl] = useState<string | null>(null);
  const [coverUrlInput, setCoverUrlInput] = useState("");
  const [isLookingUpDetails, setIsLookingUpDetails] = useState(false);
  const [lastLookedUpTitle, setLastLookedUpTitle] = useState<string | null>(null);
  const [lastLookedUpIssue, setLastLookedUpIssue] = useState<string | null>(null);
  const [newKeyInfo, setNewKeyInfo] = useState("");

  // Auto-populate publisher when title is selected
  useEffect(() => {
    const lookupPublisher = async () => {
      if (!comic.title || comic.title === lastLookedUpTitle || comic.publisher) return;

      setIsLookingUpDetails(true);
      try {
        const response = await fetch("/api/comic-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: comic.title, lookupType: "publisher" }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.publisher && !comic.publisher) {
            setComic((prev) => ({ ...prev, publisher: data.publisher }));
          }
          setLastLookedUpTitle(comic.title);
        }
      } catch (error) {
        console.error("Error looking up publisher:", error);
      } finally {
        setIsLookingUpDetails(false);
      }
    };

    const debounce = setTimeout(lookupPublisher, 500);
    return () => clearTimeout(debounce);
  }, [comic.title, comic.publisher, lastLookedUpTitle]);

  // Auto-populate details when title and issue number are both provided
  useEffect(() => {
    const lookupDetails = async () => {
      if (!comic.title || !comic.issueNumber) return;

      const lookupKey = `${comic.title}-${comic.issueNumber}`;
      if (lookupKey === `${lastLookedUpTitle}-${lastLookedUpIssue}`) return;

      // Only lookup if credits are empty (don't overwrite existing data)
      if (comic.writer && comic.coverArtist && comic.releaseYear) return;

      setIsLookingUpDetails(true);
      try {
        const response = await fetch("/api/comic-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: comic.title,
            issueNumber: comic.issueNumber,
            lookupType: "full"
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setComic((prev) => ({
            ...prev,
            publisher: prev.publisher || data.publisher,
            releaseYear: prev.releaseYear || data.releaseYear,
            writer: prev.writer || data.writer,
            coverArtist: prev.coverArtist || data.coverArtist,
            interiorArtist: prev.interiorArtist || data.interiorArtist,
            keyInfo: prev.keyInfo?.length ? prev.keyInfo : (data.keyInfo || []),
          }));
          setLastLookedUpTitle(comic.title);
          setLastLookedUpIssue(comic.issueNumber);
        }
      } catch (error) {
        console.error("Error looking up comic details:", error);
      } finally {
        setIsLookingUpDetails(false);
      }
    };

    const debounce = setTimeout(lookupDetails, 800);
    return () => clearTimeout(debounce);
  }, [comic.title, comic.issueNumber, comic.writer, comic.coverArtist, comic.releaseYear, lastLookedUpTitle, lastLookedUpIssue]);

  // Update form when initialComic changes (e.g., when API returns data)
  useEffect(() => {
    console.log("ComicDetailsForm received initialComic:", initialComic);
    setComic({
      ...initialComic,
      keyInfo: initialComic.keyInfo || [],
    });
    // Update grading fields from AI detection
    setIsGraded(initialComic.isSlabbed || false);
    setGradingCompany(initialComic.gradingCompany || "");
    setGrade(initialComic.grade || "");
    setIsSignatureSeries(initialComic.isSignatureSeries || false);
    setSignedBy(initialComic.signedBy || "");
  }, [initialComic]);

  console.log("ComicDetailsForm rendering with comic:", comic);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      comic,
      coverImageUrl,
      conditionGrade: grade ? parseFloat(grade) : null,
      conditionLabel: null, // We're using numeric grades now
      isGraded,
      gradingCompany: isGraded && gradingCompany ? gradingCompany : null,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
      notes: notes || null,
      forSale,
      askingPrice: forSale && askingPrice ? parseFloat(askingPrice) : null,
    });
  };

  const updateComic = (field: keyof ComicDetails, value: string | boolean | null) => {
    setComic((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearchCover = async () => {
    if (!comic.title) return;

    setIsSearchingCover(true);
    try {
      const response = await fetch("/api/cover-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: comic.title,
          issueNumber: comic.issueNumber,
          publisher: comic.publisher,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCoverSearchUrl(data.searchUrl);
        // Open the search URL in a new tab
        window.open(data.searchUrl, "_blank");
      }
    } catch (error) {
      console.error("Error searching for cover:", error);
    } finally {
      setIsSearchingCover(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Confidence Indicator */}
      {comic.confidence && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg ${
            comic.confidence === "high"
              ? "bg-green-50 text-green-700"
              : comic.confidence === "medium"
                ? "bg-yellow-50 text-yellow-700"
                : "bg-red-50 text-red-700"
          }`}
        >
          {comic.confidence === "high" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">
            {comic.confidence === "high"
              ? "High confidence - Most details identified"
              : comic.confidence === "medium"
                ? "Medium confidence - Please verify details"
                : "Low confidence - Manual entry recommended"}
          </span>
        </div>
      )}

      {/* Slabbed/Graded Alert */}
      {comic.isSlabbed && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">
            Graded comic detected - {comic.gradingCompany} {comic.grade}
            {comic.isSignatureSeries && " (Signature Series)"}
          </span>
        </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <TitleAutocomplete
            value={comic.title || ""}
            onChange={(value) => updateComic("title", value)}
            placeholder="e.g., Amazing Spider-Man"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Start typing for suggestions
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Issue Number *
          </label>
          <input
            type="text"
            value={comic.issueNumber || ""}
            onChange={(e) => updateComic("issueNumber", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
            placeholder="e.g., 300"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Publisher
          </label>
          <select
            value={comic.publisher || ""}
            onChange={(e) => updateComic("publisher", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
          >
            <option value="">Select publisher...</option>
            {PUBLISHERS.map((pub) => (
              <option key={pub} value={pub}>
                {pub}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Release Year
          </label>
          <input
            type="text"
            value={comic.releaseYear || ""}
            onChange={(e) => updateComic("releaseYear", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
            placeholder="e.g., 1988"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Variant
          </label>
          <input
            type="text"
            value={comic.variant || ""}
            onChange={(e) => updateComic("variant", e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
            placeholder="e.g., Cover B, 1:25 Ratio"
          />
        </div>
      </div>

      {/* Cover Image Section - only show when no cover image and title is entered */}
      {!coverImageUrl && comic.title && onCoverImageChange && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div>
            <p className="text-sm font-medium text-blue-900">Add a cover image</p>
            <p className="text-xs text-blue-700">
              Paste a cover image URL or search Google Images to find one.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={coverUrlInput}
              onChange={(e) => setCoverUrlInput(e.target.value)}
              placeholder="Paste image URL here..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                if (coverUrlInput) {
                  onCoverImageChange(coverUrlInput);
                  setCoverUrlInput("");
                }
              }}
              disabled={!coverUrlInput}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
            >
              Set Cover
            </button>
          </div>
          <button
            type="button"
            onClick={handleSearchCover}
            disabled={isSearchingCover}
            className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800"
          >
            {isSearchingCover ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search Google Images
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Credits */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          Credits
          {isLookingUpDetails && (
            <span className="flex items-center gap-1 text-xs font-normal text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Looking up details...
            </span>
          )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Writer
            </label>
            <input
              type="text"
              value={comic.writer || ""}
              onChange={(e) => updateComic("writer", e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
              placeholder="e.g., Stan Lee"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cover Artist
            </label>
            <input
              type="text"
              value={comic.coverArtist || ""}
              onChange={(e) =>
                updateComic("coverArtist", e.target.value || null)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
              placeholder="e.g., Todd McFarlane"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interior Artist
            </label>
            <input
              type="text"
              value={comic.interiorArtist || ""}
              onChange={(e) =>
                updateComic("interiorArtist", e.target.value || null)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
              placeholder="e.g., John Romita"
            />
          </div>
        </div>
      </div>

      {/* Key Info */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-yellow-600" />
          Key Info
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          First appearances, deaths, team changes, and other significant events
        </p>

        {/* Existing Key Info Items */}
        {comic.keyInfo && comic.keyInfo.length > 0 && (
          <div className="space-y-2 mb-3">
            {comic.keyInfo.map((info, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <span className="flex-1 text-sm text-gray-700">{info}</span>
                <button
                  type="button"
                  onClick={() => {
                    setComic((prev) => ({
                      ...prev,
                      keyInfo: prev.keyInfo.filter((_, i) => i !== index),
                    }));
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Remove key info"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Key Info */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyInfo}
            onChange={(e) => setNewKeyInfo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newKeyInfo.trim()) {
                e.preventDefault();
                setComic((prev) => ({
                  ...prev,
                  keyInfo: [...(prev.keyInfo || []), newKeyInfo.trim()],
                }));
                setNewKeyInfo("");
              }
            }}
            placeholder="e.g., First appearance of Venom"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (newKeyInfo.trim()) {
                setComic((prev) => ({
                  ...prev,
                  keyInfo: [...(prev.keyInfo || []), newKeyInfo.trim()],
                }));
                setNewKeyInfo("");
              }
            }}
            disabled={!newKeyInfo.trim()}
            className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grading */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Grading</h3>

        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isGraded}
              onChange={(e) => setIsGraded(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              Professionally Graded (Slabbed)
            </span>
          </label>
        </div>

        {/* Grading details - only show when slabbed */}
        {isGraded && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grading Company
                </label>
                <select
                  value={gradingCompany}
                  onChange={(e) => setGradingCompany(e.target.value as GradingCompany | "")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
                >
                  <option value="">Select company...</option>
                  {GRADING_COMPANIES.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
                >
                  <option value="">Select grade...</option>
                  {GRADE_SCALE.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Signature Series */}
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSignatureSeries}
                  onChange={(e) => setIsSignatureSeries(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  Signature Series (Signed & Authenticated)
                </span>
              </label>

              {isSignatureSeries && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Signed By
                  </label>
                  <input
                    type="text"
                    value={signedBy}
                    onChange={(e) => setSignedBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
                    placeholder="e.g., Jim Starlin"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Estimated Value */}
      {comic.priceData && comic.priceData.estimatedValue && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Estimated Value
              </h3>
              <div className="flex items-baseline gap-1">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-3xl font-bold text-green-700">
                  {comic.priceData.estimatedValue.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              {comic.priceData.mostRecentSaleDate && (
                <p className="text-xs text-gray-500 mt-1">
                  Most recent sale: {new Date(comic.priceData.mostRecentSaleDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            {/* Recent Sales Summary */}
            {comic.priceData.recentSales.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Recent Sales</p>
                <div className="space-y-0.5">
                  {comic.priceData.recentSales.slice(0, 3).map((sale, idx) => (
                    <p key={idx} className="text-xs text-gray-600">
                      ${sale.price.toLocaleString()}
                      <span className="text-gray-400 ml-1">
                        ({new Date(sale.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Disclaimer */}
          {comic.priceData.disclaimer && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-xs text-gray-500 flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {comic.priceData.disclaimer}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Purchase Info */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Purchase Info
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Price ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
              placeholder="e.g., 25.00"
            />
          </div>
        </div>
      </div>

      {/* For Sale */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={forSale}
            onChange={(e) => {
              const isChecked = e.target.checked;
              setForSale(isChecked);
              // Default asking price to estimated value when checking "For Sale"
              if (isChecked && !askingPrice && comic.priceData?.estimatedValue) {
                setAskingPrice(comic.priceData.estimatedValue.toFixed(2));
              }
            }}
            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">List for Sale</span>
        </label>

        {forSale && (
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asking Price ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
              className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
              placeholder="e.g., 50.00"
            />
            {comic.priceData?.estimatedValue && (
              <p className="text-xs text-gray-500 mt-1">
                Estimated value: ${comic.priceData.estimatedValue.toFixed(2)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
          placeholder="Any additional notes about this comic..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === "add" ? "Add to Collection" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
