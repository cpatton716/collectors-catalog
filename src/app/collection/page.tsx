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
          <h1 className="font-display text-4xl text-cc-ink tracking-wide">MY COLLECTION</h1>
          <p className="text-cc-ink/60 mt-1">
            {isFiltered ? (
              <>
                <span className="font-mono">{stats.count}</span> of <span className="font-mono">{stats.totalCount}</span> comics • <span className="font-mono text-cc-gold">${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> of <span className="font-mono">${stats.fullCollectionValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> total
              </>
            ) : (
              <>
                <span className="font-mono">{stats.count}</span> comics • <span className="font-mono text-cc-gold">${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> total value
                {stats.unpricedCount > 0 && (
                  <span className="text-cc-ink/40"> ({stats.unpricedCount} unpriced)</span>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/stats")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cc-cream border-2 border-cc-ink/10 text-cc-ink/70 rounded-lg hover:bg-cc-ink/5 transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="hidden sm:inline">Stats</span>
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cc-cream border-2 border-cc-ink/10 text-cc-ink/70 rounded-lg hover:bg-cc-ink/5 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            onClick={() => router.push("/scan")}
            className="inline-flex items-center gap-2 px-4 py-2 btn-scanner rounded-lg shadow-retro-sm hover:shadow-scanner transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Add Book
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-cc-cream rounded-lg p-4 shadow-sm border-2 border-cc-scanner/20 flex items-center gap-4">
          <div className="p-3 bg-cc-scanner/15 rounded-lg">
            <BookOpen className="w-5 h-5 text-cc-scanner" />
          </div>
          <div>
            <p className="text-sm text-cc-ink/50 uppercase tracking-wide">Comics{isFiltered && " (filtered)"}</p>
            <p className="text-xl font-bold text-cc-ink font-mono">{stats.count}</p>
          </div>
        </div>
        <div className="bg-cc-cream rounded-lg p-4 shadow-sm border-2 border-cc-purple/20 flex items-center gap-4">
          <div className="p-3 bg-cc-purple/15 rounded-lg">
            <DollarSign className="w-5 h-5 text-cc-purple" />
          </div>
          <div>
            <p className="text-sm text-cc-ink/50 uppercase tracking-wide">Total Cost</p>
            <p className="text-xl font-bold text-cc-ink font-mono">
              ${stats.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="bg-cc-cream rounded-lg p-4 shadow-sm border-2 border-cc-mint/20 flex items-center gap-4">
          <div className="p-3 bg-cc-mint/15 rounded-lg">
            <TrendingUp className="w-5 h-5 text-cc-mint" />
          </div>
          <div>
            <p className="text-sm text-cc-ink/50 uppercase tracking-wide">Est. Value{stats.unpricedCount > 0 && ` (${stats.unpricedCount} unpriced)`}</p>
            <p className="text-xl font-bold text-cc-ink font-mono">
              ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className={`bg-cc-cream rounded-lg p-4 shadow-sm border-2 flex items-center gap-4 ${
          salesStats.totalProfit >= 0 ? "border-cc-gold/20" : "border-cc-ink/10"
        }`}>
          <div className="p-3 bg-cc-gold/15 rounded-lg flex-shrink-0">
            <Receipt className="w-5 h-5 text-cc-gold" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-cc-ink/50 uppercase tracking-wide">Sales ({salesStats.totalSales})</p>
            <p className="text-xl font-bold text-cc-ink font-mono">
              ${salesStats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {salesStats.totalProfit !== 0 && (
              <p className={`text-xs font-mono ${
                salesStats.totalProfit >= 0 ? "text-cc-mint" : "text-cc-red"
              }`}>
                {salesStats.totalProfit >= 0 ? "+" : ""}${salesStats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} profit
              </p>
            )}
          </div>
        </div>
        <div className={`bg-cc-cream rounded-lg p-4 shadow-sm border-2 flex items-center gap-4 ${
          profitLoss >= 0 ? "border-cc-mint/20" : "border-cc-red/20"
        }`}>
          <div className={`p-3 rounded-lg flex-shrink-0 ${
            profitLoss >= 0 ? "bg-cc-mint/15" : "bg-cc-red/15"
          }`}>
            {profitLoss >= 0 ? (
              <ArrowUpRight className="w-5 h-5 text-cc-mint" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-cc-red" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-cc-ink/50 uppercase tracking-wide">Profit/Loss</p>
            <p className={`text-xl font-bold font-mono ${
              profitLoss >= 0 ? "text-cc-mint" : "text-cc-red"
            }`}>
              {profitLoss >= 0 ? "+" : ""}${profitLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {stats.totalCost > 0 && (
              <p className={`text-xs font-mono ${
                profitLoss >= 0 ? "text-cc-mint" : "text-cc-red"
              }`}>
                {profitLossPercent >= 0 ? "+" : ""}{profitLossPercent.toFixed(1)}%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* List Selector Tabs */}
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  selectedList === list.id
                    ? "bg-cc-scanner text-cc-ink shadow-scanner"
                    : "bg-cc-cream text-cc-ink/70 border-2 border-cc-ink/10 hover:border-cc-scanner/30"
                }`}
              >
                {list.name}
                <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                  selectedList === list.id
                    ? "bg-cc-ink/20 text-cc-ink"
                    : "bg-cc-ink/5 text-cc-ink/60"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-cc-cream rounded-xl p-4 shadow-sm border-2 border-cc-ink/10 mb-6">
        <div className="flex flex-col gap-4">
          {/* Top Row - Search and View Toggle */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cc-ink/40" />
              <input
                type="text"
                placeholder="Search by title, publisher, writer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-cc-ink/10 rounded-lg focus:ring-2 focus:ring-cc-scanner/50 focus:border-cc-scanner bg-white/50 text-cc-ink placeholder:text-cc-ink/40"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-cc-ink/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid View - Display comics as cover thumbnails"
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === "grid"
                    ? "bg-cc-scanner text-cc-ink shadow-sm"
                    : "text-cc-ink/50 hover:text-cc-ink"
                }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="List View - Display comics in a detailed table format"
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === "list"
                    ? "bg-cc-scanner text-cc-ink shadow-sm"
                    : "text-cc-ink/50 hover:text-cc-ink"
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
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 transition-all duration-200 text-sm ${
                showStarredOnly
                  ? "bg-cc-gold/20 border-cc-gold/50 text-cc-gold"
                  : "bg-white/50 border-cc-ink/10 text-cc-ink/60 hover:border-cc-gold/30"
              }`}
            >
              <Star className={`w-4 h-4 ${showStarredOnly ? "fill-cc-gold text-cc-gold" : ""}`} />
              <span className="hidden sm:inline">Starred</span>
            </button>

            {/* List Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium text-cc-ink/60 hidden md:flex items-center gap-1">
                <ListFilter className="w-4 h-4" />
                List:
              </label>
              <select
                value={selectedList}
                onChange={(e) => setSelectedList(e.target.value)}
                className="px-2.5 py-2 border-2 border-cc-ink/10 rounded-lg focus:ring-2 focus:ring-cc-scanner/50 focus:border-cc-scanner bg-white/50 text-sm text-cc-ink"
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
              <label className="text-sm font-medium text-cc-ink/60 hidden md:flex items-center gap-1">
                <Building className="w-4 h-4" />
                Publisher:
              </label>
              <select
                value={publisherFilter}
                onChange={(e) => setPublisherFilter(e.target.value)}
                className="px-2.5 py-2 border-2 border-cc-ink/10 rounded-lg focus:ring-2 focus:ring-cc-scanner/50 focus:border-cc-scanner bg-white/50 text-sm text-cc-ink"
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
              <label className="text-sm font-medium text-cc-ink/60 hidden md:flex items-center gap-1">
                <Book className="w-4 h-4" />
                Title:
              </label>
              <select
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                className="px-2.5 py-2 border-2 border-cc-ink/10 rounded-lg focus:ring-2 focus:ring-cc-scanner/50 focus:border-cc-scanner bg-white/50 text-sm text-cc-ink"
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
              <label className="text-sm font-medium text-cc-ink/60 flex items-center gap-1">
                <SortAsc className="w-4 h-4" />
                Sort:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-2.5 py-2 border-2 border-cc-ink/10 rounded-lg focus:ring-2 focus:ring-cc-scanner/50 focus:border-cc-scanner bg-white/50 text-sm text-cc-ink"
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
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 border-cc-ink/10 bg-white/50 text-cc-ink/60 hover:border-cc-scanner/30 hover:text-cc-ink transition-all duration-200 text-sm"
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
                className="text-sm text-primary-600 hover:text-primary-700 underline whitespace-nowrap"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collection Display */}
      {filteredCollection.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery || publisherFilter !== "all" || titleFilter !== "all" || showStarredOnly
              ? "No comics match your filters"
              : selectedList !== "collection"
                ? "This list is empty"
                : "Your collection is empty"}
          </h3>
          <p className="text-gray-600 mb-6">
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Clear All Filters
              </button>
            ) : (
              <button
                onClick={() => router.push("/scan")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                {selectedList !== "collection" ? "Scan a Book" : "Add Your First Comic"}
              </button>
            )}
            {selectedList !== "collection" && collection.length > 0 && (
              <button
                onClick={() => setSelectedList("collection")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-5">Comic</div>
            <div className="col-span-2">Publisher</div>
            <div className="col-span-2 text-right">Est. Value</div>
            <div className="col-span-2 text-right">Purchase Price</div>
            <div className="col-span-1 text-center">For Sale</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
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
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors items-center"
                >
                  {/* Comic Info */}
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                      {item.coverImageUrl ? (
                        <img
                          src={item.coverImageUrl}
                          alt={`${comic.title} #${comic.issueNumber}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-xs">
                          <span className="text-green-400 font-bold italic drop-shadow-[0_0_4px_rgba(74,222,128,0.6)]">?</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">
                          {comic.title || "Unknown Title"}
                        </p>
                        {item.isStarred && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Issue #{comic.issueNumber || "?"}
                        {comic.variant && (
                          <span className="text-gray-400"> • {comic.variant}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Publisher */}
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 truncate">
                      {comic.publisher || "Unknown"}
                    </p>
                  </div>

                  {/* Est. Value */}
                  <div className="col-span-2 text-right">
                    {estimatedValue > 0 ? (
                      <div>
                        <p className="font-medium text-gray-900">
                          ${estimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {itemProfitLoss !== null && (
                          <p className={`text-xs ${itemProfitLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {itemProfitLoss >= 0 ? "+" : ""}${itemProfitLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </div>

                  {/* Purchase Price */}
                  <div className="col-span-2 text-right">
                    {item.purchasePrice ? (
                      <p className="font-medium text-gray-900">
                        ${item.purchasePrice.toFixed(2)}
                      </p>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </div>

                  {/* For Sale */}
                  <div className="col-span-1 flex justify-center">
                    {item.forSale ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        <Tag className="w-3 h-3" />
                        <span className="text-xs font-medium">
                          ${item.askingPrice?.toFixed(0) || "—"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
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
          <div className="absolute inset-0 bg-black/50" onClick={handleCancelEdit} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] md:max-h-[90vh] overflow-hidden">
            <div className="flex flex-col lg:flex-row max-h-[85vh] md:max-h-[90vh]">
              {/* Image Preview - Hidden on mobile, shown on desktop */}
              <div className="hidden lg:block lg:w-1/3 p-6 bg-gray-50 border-r border-gray-100">
                <div className="sticky top-6">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 shadow-lg">
                    {editingItem.coverImageUrl ? (
                      <img
                        src={editingItem.coverImageUrl}
                        alt="Comic cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-4xl">
                        <span className="text-green-400 font-bold italic drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]">?</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="lg:w-2/3 p-4 md:p-6 overflow-y-auto">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 md:mb-6">
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
