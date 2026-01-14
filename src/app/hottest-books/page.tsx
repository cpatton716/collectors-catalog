"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flame, TrendingUp, DollarSign, Loader2, RefreshCw, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/statsCalculator";

interface HotBook {
  rank: number;
  title: string;
  issueNumber: string;
  publisher: string;
  year: string;
  keyFacts: string[];
  whyHot: string;
  priceRange: {
    low: number;
    mid: number;
    high: number;
  };
  coverImageUrl?: string;
}

export default function HottestBooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<HotBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<HotBook | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    keyFacts: true,
    whyHot: true,
    priceRange: true,
  });
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const bookListRef = useRef<HTMLDivElement>(null);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSelectBook = (book: HotBook) => {
    setSelectedBook(book);
    // Auto-scroll to detail panel on mobile
    if (window.innerWidth < 1024 && detailPanelRef.current) {
      setTimeout(() => {
        detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const navigateBook = (direction: "prev" | "next") => {
    if (!selectedBook || books.length === 0) return;
    const currentIndex = books.findIndex(b => b.rank === selectedBook.rank);
    let newIndex: number;
    if (direction === "prev") {
      newIndex = currentIndex > 0 ? currentIndex - 1 : books.length - 1;
    } else {
      newIndex = currentIndex < books.length - 1 ? currentIndex + 1 : 0;
    }
    setSelectedBook(books[newIndex]);
  };

  // Touch swipe handling
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        navigateBook("next"); // Swipe left = next
      } else {
        navigateBook("prev"); // Swipe right = prev
      }
    }
    touchStartX.current = null;
  };

  const fetchHotBooks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/hottest-books");
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setBooks(data.books || []);
      }
    } catch (err) {
      console.error("Error fetching hot books:", err);
      setError("We couldn't load the hottest books right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHotBooks();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg mb-4 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <Flame className="w-10 h-10" />
            <div>
              <h1 className="text-3xl font-bold">Professor&apos;s Hottest Books</h1>
              <p className="text-white/80 mt-1">
                Weekly market analysis of the most in-demand comics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
            <p className="text-gray-600">Loading the hottest books...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchHotBooks}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Book List */}
            <div ref={bookListRef} className="lg:col-span-2 space-y-4">
              {books.map((book) => (
                <div
                  key={book.rank}
                  onClick={() => handleSelectBook(book)}
                  className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer transition-all hover:shadow-md ${
                    selectedBook?.rank === book.rank
                      ? "border-orange-500 ring-2 ring-orange-200"
                      : "border-gray-100"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {book.rank}
                    </div>

                    {/* Cover Image */}
                    {book.coverImageUrl && (
                      <div className="flex-shrink-0 w-16 h-24 bg-gray-100 rounded overflow-hidden">
                        <img
                          src={book.coverImageUrl}
                          alt={`${book.title} #${book.issueNumber}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Book Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {book.title} #{book.issueNumber}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {book.publisher} &middot; {book.year}
                      </p>

                      {/* Key Facts Preview */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {book.keyFacts.slice(0, 2).map((fact, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                          >
                            {fact}
                          </span>
                        ))}
                      </div>

                      {/* Price Range */}
                      <div className="mt-3 flex items-center flex-wrap gap-x-4 gap-y-1 text-sm">
                        <div className="flex items-center gap-1 text-gray-500">
                          <DollarSign className="w-4 h-4" />
                          <span>Low: ${formatCurrency(book.priceRange.low)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-green-600 font-medium">
                          <span>Mid: ${formatCurrency(book.priceRange.mid)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <span>High: ${formatCurrency(book.priceRange.high)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Trend Icon */}
                    <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>

            {/* Detail Panel */}
            <div ref={detailPanelRef} className="lg:col-span-1">
              <div
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-4"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {selectedBook ? (
                  <>
                    {/* Header with navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold text-gray-900">
                          #{selectedBook.rank} on the Hot List
                        </h3>
                      </div>
                      {/* Navigation buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigateBook("prev")}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          aria-label="Previous book"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <button
                          onClick={() => navigateBook("next")}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          aria-label="Next book"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                    </div>

                    {/* Cover Image - larger on mobile */}
                    {selectedBook.coverImageUrl && (
                      <div className="w-full aspect-[2/3] max-w-[240px] sm:max-w-[180px] mx-auto mb-4 bg-gray-100 rounded-lg overflow-hidden shadow-md">
                        <img
                          src={selectedBook.coverImageUrl}
                          alt={`${selectedBook.title} #${selectedBook.issueNumber}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <h2 className="text-xl font-bold text-gray-900 mb-1 text-center sm:text-left">
                      {selectedBook.title} #{selectedBook.issueNumber}
                    </h2>
                    <p className="text-gray-500 mb-4 text-center sm:text-left">
                      {selectedBook.publisher} &middot; {selectedBook.year}
                    </p>

                    {/* Key Facts - Collapsible */}
                    <div className="mb-3 border border-gray-100 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleSection("keyFacts")}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <h4 className="text-sm font-semibold text-gray-700">Key Facts</h4>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.keyFacts ? "rotate-180" : ""}`} />
                      </button>
                      {expandedSections.keyFacts && (
                        <ul className="p-3 space-y-2">
                          {selectedBook.keyFacts.map((fact, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                              {fact}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Why Hot - Collapsible */}
                    <div className="mb-3 border border-gray-100 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleSection("whyHot")}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <h4 className="text-sm font-semibold text-gray-700">Why It&apos;s Hot</h4>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.whyHot ? "rotate-180" : ""}`} />
                      </button>
                      {expandedSections.whyHot && (
                        <p className="p-3 text-sm text-gray-600">{selectedBook.whyHot}</p>
                      )}
                    </div>

                    {/* Price Range - Collapsible */}
                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleSection("priceRange")}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <h4 className="text-sm font-semibold text-gray-700">Price Range (VF-NM Raw)</h4>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.priceRange ? "rotate-180" : ""}`} />
                      </button>
                      {expandedSections.priceRange && (
                        <div className="p-3">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-xs text-gray-500">Low</p>
                              <p className="text-lg font-semibold text-gray-700">
                                ${formatCurrency(selectedBook.priceRange.low)}
                              </p>
                            </div>
                            <div className="bg-green-50 rounded-lg py-1">
                              <p className="text-xs text-green-600">Mid</p>
                              <p className="text-lg font-semibold text-green-700">
                                ${formatCurrency(selectedBook.priceRange.mid)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">High</p>
                              <p className="text-lg font-semibold text-gray-700">
                                ${formatCurrency(selectedBook.priceRange.high)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Swipe hint on mobile */}
                    <p className="mt-4 text-xs text-gray-400 text-center lg:hidden">
                      Swipe or use arrows to navigate between books
                    </p>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Flame className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>Select a book to see details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
