"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { storage } from "@/lib/storage";
import { calculateCollectionValue, getComicValue } from "@/lib/gradePrice";
import { CollectionItem, UserList } from "@/types/comic";
import { useCollection } from "@/hooks/useCollection";
import { ComicCard } from "@/components/ComicCard";
import { ComicListItem } from "@/components/ComicListItem";
import { ComicDetailModal } from "@/components/ComicDetailModal";
import { ComicDetailsForm } from "@/components/ComicDetailsForm";
import { CollectionPageSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import {
  Grid3X3,
  List,
  ListFilter,
  Plus,
  Search,
  Filter,
  SortAsc,
  BookOpen,
  Book,
  Building,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Check,
  ChevronRight,
  Tag,
  Download,
  Share2,
  BarChart3,
} from "lucide-react";
import { exportCollectionToCSV } from "@/lib/csvExport";
import { ShareCollectionModal } from "@/components/ShareCollectionModal";
import { FeatureButton, PremiumBadge } from "@/components/FeatureGate";
import { useSubscription } from "@/hooks/useSubscription";

type ViewMode = "grid" | "list";
type SortOption = "date" | "title" | "value" | "issue";
type FilterOption = "all" | string;

export default function CollectionPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useUser();
  const { showToast } = useToast();
  const { features } = useSubscription();

  // Use the collection hook for cloud sync
  const {
    collection,
    lists,
    sales,
    isLoading: collectionLoading,
    isCloudEnabled,
    addToCollection,
    updateCollectionItem: updateItem,
    removeFromCollection,
    createList: createNewList,
    addItemToList,
    removeItemFromList,
    recordSale,
    getCollectionStats,
    getSalesStats,
  } = useCollection();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedList, setSelectedList] = useState<string>("collection");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("issue");
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [publisherFilter, setPublisherFilter] = useState<FilterOption>("all");
  const [titleFilter, setTitleFilter] = useState<FilterOption>("all");
  const [showShareModal, setShowShareModal] = useState(false);

  const salesStats = getSalesStats();
  const isLoaded = authLoaded && !collectionLoading;

  // Get unique publishers and titles for filters
  const uniquePublishers = Array.from(new Set(collection.map(item => item.comic.publisher).filter((p): p is string => Boolean(p)))).sort();
  const uniqueTitles = Array.from(new Set(collection.map(item => item.comic.title).filter((t): t is string => Boolean(t)))).sort();

  // Filter and sort collection
  const filteredCollection = collection
    .filter((item) => {
      // Filter by list
      if (selectedList !== "collection") {
        if (!item.listIds.includes(selectedList)) return false;
      }

      // Filter by starred
      if (showStarredOnly && !item.isStarred) {
        return false;
      }

      // Filter by publisher
      if (publisherFilter !== "all" && item.comic.publisher !== publisherFilter) {
        return false;
      }

      // Filter by title
      if (titleFilter !== "all" && item.comic.title !== titleFilter) {
        return false;
      }

      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.comic.title?.toLowerCase().includes(query) ||
          item.comic.publisher?.toLowerCase().includes(query) ||
          item.comic.writer?.toLowerCase().includes(query) ||
          item.comic.issueNumber?.includes(query)
        );
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "title":
          return (a.comic.title || "").localeCompare(b.comic.title || "");
        case "value":
          return (
            (b.averagePrice || b.purchasePrice || 0) -
            (a.averagePrice || a.purchasePrice || 0)
          );
        case "issue":
          return (
            parseInt(a.comic.issueNumber || "0") -
            parseInt(b.comic.issueNumber || "0")
          );
        case "date":
        default:
          return (
            new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
          );
      }
    });

  // Calculate stats for current view using grade-aware pricing
  const filteredValue = calculateCollectionValue(filteredCollection);
  const totalCollectionValue = calculateCollectionValue(collection);
  const isFiltered = filteredCollection.length !== collection.length;

  const stats = {
    count: filteredCollection.length,
    totalCount: collection.length,
    totalValue: filteredValue.totalValue,
    fullCollectionValue: totalCollectionValue.totalValue,
    unpricedCount: filteredValue.unpricedCount,
    totalCost: filteredCollection.reduce(
      (sum, item) => sum + (item.purchasePrice || 0),
      0
    ),
    forSale: filteredCollection.filter((item) => item.forSale).length,
  };
  const profitLoss = stats.totalValue - stats.totalCost;
  const profitLossPercent = stats.totalCost > 0 ? ((profitLoss / stats.totalCost) * 100) : 0;

  const handleComicClick = (item: CollectionItem) => {
    setSelectedItem(item);
    storage.addToRecentlyViewed(item.id);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  const handleRemove = async (id: string) => {
    const item = collection.find((c) => c.id === id);
    try {
      await removeFromCollection(id);
      showToast(`"${item?.comic.title}" removed from collection`, "success");
    } catch {
      showToast("Failed to remove comic", "error");
    }
  };

  const handleAddToList = async (itemId: string, listId: string) => {
    const list = lists.find((l) => l.id === listId);
    try {
      await addItemToList(itemId, listId);
      showToast(`Added to "${list?.name}"`, "success");
      // Update selected item view
      const item = collection.find((i) => i.id === itemId);
      if (item) {
        setSelectedItem({ ...item, listIds: [...item.listIds, listId] });
      }
    } catch {
      showToast("Failed to add to list", "error");
    }
  };

  const handleRemoveFromList = async (itemId: string, listId: string) => {
    const list = lists.find((l) => l.id === listId);
    try {
      await removeItemFromList(itemId, listId);
      showToast(`Removed from "${list?.name}"`, "info");
      // Update selected item view
      const item = collection.find((i) => i.id === itemId);
      if (item) {
        setSelectedItem({ ...item, listIds: item.listIds.filter(id => id !== listId) });
      }
    } catch {
      showToast("Failed to remove from list", "error");
    }
  };

  const handleCreateList = async (name: string) => {
    try {
      const newList = await createNewList(name);
      showToast(`List "${name}" created`, "success");
      return newList;
    } catch {
      showToast("Failed to create list", "error");
      throw new Error("Failed to create list");
    }
  };

  const handleMarkSold = async (itemId: string, salePrice: number) => {
    const item = collection.find((c) => c.id === itemId);
    if (item) {
      const profit = salePrice - (item.purchasePrice || 0);
      try {
        await recordSale(item, salePrice);
        setSelectedItem(null);
        showToast(
          `Sale recorded! ${profit >= 0 ? "Profit" : "Loss"}: $${Math.abs(profit).toFixed(2)}`,
          profit >= 0 ? "success" : "info"
        );
      } catch {
        showToast("Failed to record sale", "error");
      }
    }
  };

  const handleToggleStar = async (itemId: string) => {
    const item = collection.find((c) => c.id === itemId);
    if (item) {
      try {
        await updateItem(itemId, { isStarred: !item.isStarred });
        showToast(
          item.isStarred ? "Removed from favorites" : "Added to favorites",
          "success"
        );
        // Update selected item if it's the one being toggled
        if (selectedItem?.id === itemId) {
          setSelectedItem({ ...item, isStarred: !item.isStarred });
        }
      } catch {
        showToast("Failed to update", "error");
      }
    }
  };

  const handleEdit = (item: CollectionItem) => {
    setSelectedItem(null); // Close detail modal
    setEditingItem(item);
  };

  const handleSaveEdit = async (itemData: Partial<CollectionItem>) => {
    if (editingItem) {
      try {
        await updateItem(editingItem.id, {
          ...itemData,
          comic: itemData.comic || editingItem.comic,
        });
        setEditingItem(null);
        showToast("Changes saved", "success");
      } catch {
        showToast("Failed to save changes", "error");
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleExportCSV = () => {
    if (filteredCollection.length === 0) {
      showToast("No comics to export", "info");
      return;
    }
    exportCollectionToCSV(filteredCollection);
    showToast(`Exported ${filteredCollection.length} comics to CSV`, "success");
  };

  if (!isLoaded) {
    return <CollectionPageSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display text-vintage-ink uppercase tracking-wide">My Collection</h1>
          <p className="text-vintage-inkSoft font-serif mt-1">
            {isFiltered ? (
              <>
                {stats.count} of {stats.totalCount} comics • ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${stats.fullCollectionValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
              </>
            ) : (
              <>
                {stats.count} comics • ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total value
                {stats.unpricedCount > 0 && (
                  <span className="text-vintage-inkFaded"> ({stats.unpricedCount} unpriced)</span>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/stats")}
            className="btn-vintage bg-vintage-paper text-vintage-ink hover:bg-vintage-aged"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="hidden sm:inline">Stats</span>
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="btn-vintage bg-vintage-paper text-vintage-ink hover:bg-vintage-aged"
          >
            <Share2 className="w-5 h-5" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            onClick={() => router.push("/scan")}
            className="btn-vintage bg-vintage-red text-white hover:bg-vintage-redDark"
          >
            <Plus className="w-5 h-5" />
            Add Book
          </button>
        </div>
      </div>

      {/* Stats Cards - Vintage Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-vintage-cream border-2 border-vintage-ink p-4 shadow-vintage-sm flex items-center gap-4">
          <div className="p-3 bg-vintage-blue border border-vintage-blueDark">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-vintage-inkFaded font-mono uppercase tracking-wide">Comics{isFiltered && " (filtered)"}</p>
            <p className="text-xl font-display text-vintage-ink">{stats.count}</p>
          </div>
        </div>
        <div className="bg-vintage-cream border-2 border-vintage-ink p-4 shadow-vintage-sm flex items-center gap-4">
          <div className="p-3 bg-vintage-brown border border-vintage-ink">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-vintage-inkFaded font-mono uppercase tracking-wide">Total Cost</p>
            <p className="text-xl font-display text-vintage-ink">
              ${stats.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="bg-vintage-cream border-2 border-vintage-ink p-4 shadow-vintage-sm flex items-center gap-4">
          <div className="p-3 bg-green-600 border border-green-800">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-vintage-inkFaded font-mono uppercase tracking-wide">Est. Value{stats.unpricedCount > 0 && ` (${stats.unpricedCount} unpriced)`}</p>
            <p className="text-xl font-display text-vintage-ink">
              ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="bg-vintage-cream border-2 border-vintage-ink p-4 shadow-vintage-sm flex items-center gap-4">
          <div className="p-3 bg-vintage-yellow border border-vintage-yellowDark flex-shrink-0">
            <Receipt className="w-5 h-5 text-vintage-ink" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-vintage-inkFaded font-mono uppercase tracking-wide">Sales ({salesStats.totalSales})</p>
            <p className="text-xl font-display text-vintage-ink">
              ${salesStats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {salesStats.totalProfit !== 0 && (
              <p className={`text-xs font-mono ${
                salesStats.totalProfit >= 0 ? "text-green-700" : "text-vintage-red"
              }`}>
                {salesStats.totalProfit >= 0 ? "+" : ""}${salesStats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} profit
              </p>
            )}
          </div>
        </div>
        <div className={`bg-vintage-cream border-2 border-vintage-ink p-4 shadow-vintage-sm flex items-center gap-4`}>
          <div className={`p-3 flex-shrink-0 border ${
            profitLoss >= 0 ? "bg-green-600 border-green-800" : "bg-vintage-red border-vintage-redDark"
          }`}>
            {profitLoss >= 0 ? (
              <ArrowUpRight className="w-5 h-5 text-white" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-vintage-inkFaded font-mono uppercase tracking-wide">Profit/Loss</p>
            <p className={`text-xl font-display ${
              profitLoss >= 0 ? "text-green-700" : "text-vintage-red"
            }`}>
              {profitLoss >= 0 ? "+" : ""}${profitLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {stats.totalCost > 0 && (
              <p className={`text-xs font-mono ${
                profitLoss >= 0 ? "text-green-700" : "text-vintage-red"
              }`}>
                {profitLossPercent >= 0 ? "+" : ""}{profitLossPercent.toFixed(1)}%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* List Selector Tabs - Vintage Style */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {lists.map((list) => {
            const count = list.id === "collection"
              ? collection.length
              : collection.filter(item => item.listIds.includes(list.id)).length;

            // Hide empty lists (except the main collection)
            if (count === 0 && list.id !== "collection") {
              return null;
            }

            return (
              <button
                key={list.id}
                onClick={() => setSelectedList(list.id)}
                className={`px-4 py-2 text-sm font-display uppercase tracking-wide transition-colors flex items-center gap-2 border-2 ${
                  selectedList === list.id
                    ? "bg-vintage-blue text-white border-vintage-blueDark shadow-vintage-sm"
                    : "bg-vintage-paper text-vintage-ink border-vintage-ink hover:bg-vintage-aged"
                }`}
              >
                {list.name}
                <span className={`px-1.5 py-0.5 text-xs font-mono ${
                  selectedList === list.id
                    ? "bg-vintage-blueDark text-white"
                    : "bg-vintage-aged text-vintage-inkSoft"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters Bar - Vintage Style */}
      <div className="bg-vintage-cream border-3 border-vintage-ink p-4 shadow-vintage mb-6">
        <div className="flex flex-col gap-4">
          {/* Top Row - Search and View Toggle */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vintage-inkFaded" />
              <input
                type="text"
                placeholder="Search by title, publisher, writer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-vintage-ink bg-vintage-paper focus:ring-2 focus:ring-vintage-blue focus:border-vintage-blue text-vintage-ink placeholder:text-vintage-inkFaded font-serif"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-vintage-aged border-2 border-vintage-ink p-1">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid View - Display comics as cover thumbnails"
                className={`p-2 transition-colors ${
                  viewMode === "grid"
                    ? "bg-vintage-blue text-white shadow-vintage-sm"
                    : "text-vintage-inkFaded hover:text-vintage-ink"
                }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="List View - Display comics in a detailed table format"
                className={`p-2 transition-colors ${
                  viewMode === "list"
                    ? "bg-vintage-blue text-white shadow-vintage-sm"
                    : "text-vintage-inkFaded hover:text-vintage-ink"
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bottom Row - Filters */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* Starred Filter */}
            <button
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className={`flex items-center gap-1.5 px-2.5 py-2 border-2 transition-colors text-sm font-display uppercase ${
                showStarredOnly
                  ? "bg-vintage-yellow border-vintage-yellowDark text-vintage-ink"
                  : "bg-vintage-paper border-vintage-ink text-vintage-inkFaded hover:bg-vintage-aged"
              }`}
            >
              <Star className={`w-4 h-4 ${showStarredOnly ? "fill-vintage-ink text-vintage-ink" : ""}`} />
              <span className="hidden sm:inline">Starred</span>
            </button>

            {/* List Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-mono text-vintage-inkFaded uppercase tracking-wide hidden md:flex items-center gap-1">
                <ListFilter className="w-4 h-4" />
                List:
              </label>
              <select
                value={selectedList}
                onChange={(e) => setSelectedList(e.target.value)}
                className="px-2.5 py-2 border-2 border-vintage-ink bg-vintage-paper focus:ring-2 focus:ring-vintage-blue text-sm text-vintage-ink font-serif"
              >
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Publisher Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-mono text-vintage-inkFaded uppercase tracking-wide hidden md:flex items-center gap-1">
                <Building className="w-4 h-4" />
                Publisher:
              </label>
              <select
                value={publisherFilter}
                onChange={(e) => setPublisherFilter(e.target.value)}
                className="px-2.5 py-2 border-2 border-vintage-ink bg-vintage-paper focus:ring-2 focus:ring-vintage-blue text-sm text-vintage-ink font-serif"
              >
                <option value="all">All Publishers</option>
                {uniquePublishers.map((publisher) => (
                  <option key={publisher} value={publisher}>
                    {publisher}
                  </option>
                ))}
              </select>
            </div>

            {/* Title Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-mono text-vintage-inkFaded uppercase tracking-wide hidden md:flex items-center gap-1">
                <Book className="w-4 h-4" />
                Title:
              </label>
              <select
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                className="px-2.5 py-2 border-2 border-vintage-ink bg-vintage-paper focus:ring-2 focus:ring-vintage-blue text-sm text-vintage-ink font-serif"
              >
                <option value="all">All Titles</option>
                {uniqueTitles.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 ml-auto">
              <label className="text-sm font-mono text-vintage-inkFaded uppercase tracking-wide flex items-center gap-1">
                <SortAsc className="w-4 h-4" />
                Sort:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-2.5 py-2 border-2 border-vintage-ink bg-vintage-paper focus:ring-2 focus:ring-vintage-blue text-sm text-vintage-ink font-serif"
              >
                <option value="date">Date Added</option>
                <option value="title">Title</option>
                <option value="value">Value</option>
                <option value="issue">Issue #</option>
              </select>
            </div>

            {/* Export CSV - Premium Feature */}
            <FeatureButton
              feature="csvExport"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-2.5 py-2 border-2 border-vintage-ink bg-vintage-paper text-vintage-inkFaded hover:bg-vintage-aged hover:text-vintage-ink transition-colors text-sm font-display uppercase"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </FeatureButton>

            {/* Clear Filters */}
            {(publisherFilter !== "all" || titleFilter !== "all" || showStarredOnly || searchQuery || selectedList !== "collection") && (
              <button
                onClick={() => {
                  setPublisherFilter("all");
                  setTitleFilter("all");
                  setShowStarredOnly(false);
                  setSearchQuery("");
                  setSelectedList("collection");
                }}
                className="text-sm text-vintage-red hover:text-vintage-redDark underline whitespace-nowrap font-mono"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collection Display */}
      {filteredCollection.length === 0 ? (
        <div className="bg-vintage-cream border-3 border-vintage-ink p-12 shadow-vintage text-center">
          <div className="w-16 h-16 bg-vintage-aged border-2 border-vintage-ink flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-vintage-inkFaded" />
          </div>
          <h3 className="text-lg font-display text-vintage-ink uppercase tracking-wide mb-2">
            {searchQuery || publisherFilter !== "all" || titleFilter !== "all" || showStarredOnly
              ? "No comics match your filters"
              : selectedList !== "collection"
                ? "This list is empty"
                : "Your collection is empty"}
          </h3>
          <p className="text-vintage-inkSoft font-serif mb-6">
            {searchQuery || publisherFilter !== "all" || titleFilter !== "all" || showStarredOnly
              ? "Try adjusting your filters or search terms"
              : selectedList !== "collection"
                ? "Add comics to this list from the comic details view"
                : "Start by scanning your first comic book cover"}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {(searchQuery || publisherFilter !== "all" || titleFilter !== "all" || showStarredOnly) ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setPublisherFilter("all");
                  setTitleFilter("all");
                  setShowStarredOnly(false);
                }}
                className="btn-vintage bg-vintage-blue text-white hover:bg-vintage-blueDark"
              >
                Clear All Filters
              </button>
            ) : (
              <button
                onClick={() => router.push("/scan")}
                className="btn-vintage bg-vintage-red text-white hover:bg-vintage-redDark inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {selectedList !== "collection" ? "Scan a Book" : "Add Your First Comic"}
              </button>
            )}
            {selectedList !== "collection" && collection.length > 0 && (
              <button
                onClick={() => setSelectedList("collection")}
                className="btn-vintage bg-vintage-paper text-vintage-ink hover:bg-vintage-aged"
              >
                View All Comics
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredCollection.map((item) => (
            <ComicCard
              key={item.id}
              item={item}
              onClick={() => handleComicClick(item)}
              onToggleStar={handleToggleStar}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <div className="bg-vintage-cream border-3 border-vintage-ink shadow-vintage overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-vintage-aged border-b-2 border-vintage-ink text-xs font-display text-vintage-ink uppercase tracking-wider">
            <div className="col-span-5">Comic</div>
            <div className="col-span-2">Publisher</div>
            <div className="col-span-2 text-right">Est. Value</div>
            <div className="col-span-2 text-right">Purchase Price</div>
            <div className="col-span-1 text-center">For Sale</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-vintage-ink/20">
            {filteredCollection.map((item) => {
              const { comic } = item;
              const estimatedValue = getComicValue(item);
              const itemProfitLoss = estimatedValue && item.purchasePrice
                ? estimatedValue - item.purchasePrice
                : null;

              return (
                <div
                  key={item.id}
                  onClick={() => handleComicClick(item)}
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-vintage-aged cursor-pointer transition-colors items-center"
                >
                  {/* Comic Info */}
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-10 h-14 flex-shrink-0 overflow-hidden bg-vintage-aged border border-vintage-ink">
                      {item.coverImageUrl ? (
                        <img
                          src={item.coverImageUrl}
                          alt={`${comic.title} #${comic.issueNumber}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-vintage-ink text-xs">
                          <span className="text-vintage-yellow font-display">?</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-display text-vintage-ink truncate uppercase">
                          {comic.title || "Unknown Title"}
                        </p>
                        {item.isStarred && (
                          <Star className="w-4 h-4 text-vintage-yellow fill-vintage-yellow flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-vintage-inkFaded font-mono">
                        Issue #{comic.issueNumber || "?"}
                        {comic.variant && (
                          <span className="text-vintage-inkFaded"> • {comic.variant}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Publisher */}
                  <div className="col-span-2">
                    <p className="text-sm text-vintage-inkSoft font-serif truncate">
                      {comic.publisher || "Unknown"}
                    </p>
                  </div>

                  {/* Est. Value */}
                  <div className="col-span-2 text-right">
                    {estimatedValue > 0 ? (
                      <div>
                        <p className="font-display text-vintage-ink">
                          ${estimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {itemProfitLoss !== null && (
                          <p className={`text-xs font-mono ${itemProfitLoss >= 0 ? "text-green-700" : "text-vintage-red"}`}>
                            {itemProfitLoss >= 0 ? "+" : ""}${itemProfitLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-vintage-inkFaded">—</span>
                    )}
                  </div>

                  {/* Purchase Price */}
                  <div className="col-span-2 text-right">
                    {item.purchasePrice ? (
                      <p className="font-display text-vintage-ink">
                        ${item.purchasePrice.toFixed(2)}
                      </p>
                    ) : (
                      <span className="text-sm text-vintage-inkFaded">—</span>
                    )}
                  </div>

                  {/* For Sale */}
                  <div className="col-span-1 flex justify-center">
                    {item.forSale ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-vintage-yellow text-vintage-ink border border-vintage-yellowDark">
                        <Tag className="w-3 h-3" />
                        <span className="text-xs font-display">
                          ${item.askingPrice?.toFixed(0) || "—"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-vintage-inkFaded">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comic Detail Modal */}
      {selectedItem && (
        <ComicDetailModal
          item={selectedItem}
          lists={lists}
          collection={collection}
          onClose={handleCloseModal}
          onRemove={handleRemove}
          onAddToList={handleAddToList}
          onRemoveFromList={handleRemoveFromList}
          onCreateList={handleCreateList}
          onMarkSold={handleMarkSold}
          onToggleStar={handleToggleStar}
          onEdit={handleEdit}
          onViewItem={(item) => setSelectedItem(item)}
        />
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 md:pb-4">
          <div className="absolute inset-0 bg-vintage-ink/70" onClick={handleCancelEdit} />
          <div className="relative bg-vintage-cream border-3 border-vintage-ink shadow-vintage-lg max-w-4xl w-full max-h-[85vh] md:max-h-[90vh] overflow-hidden">
            <div className="flex flex-col lg:flex-row max-h-[85vh] md:max-h-[90vh]">
              {/* Image Preview - Hidden on mobile, shown on desktop */}
              <div className="hidden lg:block lg:w-1/3 p-6 bg-vintage-aged border-r-3 border-vintage-ink">
                <div className="sticky top-6">
                  <div className="aspect-[2/3] overflow-hidden bg-vintage-paper border-2 border-vintage-ink shadow-vintage">
                    {editingItem.coverImageUrl ? (
                      <img
                        src={editingItem.coverImageUrl}
                        alt="Comic cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-vintage-ink text-4xl">
                        <span className="text-vintage-yellow font-display">?</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="lg:w-2/3 p-4 md:p-6 overflow-y-auto">
                <h2 className="text-lg md:text-xl font-display text-vintage-ink mb-4 md:mb-6 uppercase tracking-wide">
                  Edit Comic Details
                </h2>
                <ComicDetailsForm
                  key={editingItem.id}
                  comic={editingItem.comic}
                  coverImageUrl={editingItem.coverImageUrl}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                  mode="edit"
                  existingItem={editingItem}
                  onCoverImageChange={(url) => {
                    setEditingItem({
                      ...editingItem,
                      coverImageUrl: url,
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Collection Modal */}
      {showShareModal && (
        <ShareCollectionModal onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
}
