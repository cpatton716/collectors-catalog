"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { CollectionItem, UserList } from "@/types/comic";
import { ComicCard } from "@/components/ComicCard";
import { ComicListItem } from "@/components/ComicListItem";
import { ComicDetailModal } from "@/components/ComicDetailModal";
import { ComicDetailsForm } from "@/components/ComicDetailsForm";
import { CollectionPageSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import {
  Grid3X3,
  List,
  Plus,
  Search,
  Filter,
  SortAsc,
  BookOpen,
  Book,
  Factory,
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
} from "lucide-react";

type ViewMode = "grid" | "list";
type SortOption = "date" | "title" | "value" | "issue";
type FilterOption = "all" | string;

export default function CollectionPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [lists, setLists] = useState<UserList[]>([]);
  const [selectedList, setSelectedList] = useState<string>("collection");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [publisherFilter, setPublisherFilter] = useState<FilterOption>("all");
  const [titleFilter, setTitleFilter] = useState<FilterOption>("all");

  const [salesStats, setSalesStats] = useState({ totalSales: 0, totalRevenue: 0, totalProfit: 0 });

  useEffect(() => {
    setCollection(storage.getCollection());
    setLists(storage.getLists());
    setSalesStats(storage.getSalesStats());
    setIsLoaded(true);
  }, []);

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

  // Calculate stats for current view
  const stats = {
    count: filteredCollection.length,
    totalValue: filteredCollection.reduce(
      (sum, item) => sum + (item.comic.priceData?.estimatedValue || 0),
      0
    ),
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

  const handleRemove = (id: string) => {
    const item = collection.find((c) => c.id === id);
    const updatedCollection = storage.removeFromCollection(id);
    setCollection(updatedCollection);
    showToast(`"${item?.comic.title}" removed from collection`, "success");
  };

  const handleAddToList = (itemId: string, listId: string) => {
    const updatedCollection = storage.addItemToList(itemId, listId);
    setCollection(updatedCollection);
    const list = lists.find((l) => l.id === listId);
    const item = updatedCollection.find((i) => i.id === itemId);
    showToast(`Added to "${list?.name}"`, "success");
    // Update the selected item to reflect the change
    if (item) {
      setSelectedItem(item);
    }
  };

  const handleRemoveFromList = (itemId: string, listId: string) => {
    const updatedCollection = storage.removeItemFromList(itemId, listId);
    setCollection(updatedCollection);
    const list = lists.find((l) => l.id === listId);
    showToast(`Removed from "${list?.name}"`, "info");
    // Update the selected item to reflect the change
    const updatedItem = updatedCollection.find((item) => item.id === itemId);
    if (updatedItem) {
      setSelectedItem(updatedItem);
    }
  };

  const handleCreateList = (name: string) => {
    const newList = storage.createList(name);
    setLists(storage.getLists());
    showToast(`List "${name}" created`, "success");
    return newList;
  };

  const handleMarkSold = (itemId: string, salePrice: number) => {
    const item = collection.find((c) => c.id === itemId);
    if (item) {
      const profit = salePrice - (item.purchasePrice || 0);
      storage.recordSale(item, salePrice);
      setCollection(storage.getCollection());
      setSalesStats(storage.getSalesStats());
      setSelectedItem(null);
      showToast(
        `Sale recorded! ${profit >= 0 ? "Profit" : "Loss"}: $${Math.abs(profit).toFixed(2)}`,
        profit >= 0 ? "success" : "info"
      );
    }
  };

  const handleToggleStar = (itemId: string) => {
    const item = collection.find((c) => c.id === itemId);
    if (item) {
      const updatedCollection = storage.updateCollectionItem(itemId, {
        isStarred: !item.isStarred,
      });
      setCollection(updatedCollection);
      showToast(
        item.isStarred ? "Removed from favorites" : "Added to favorites",
        "success"
      );
      // Update selected item if it's the one being toggled
      const updatedItem = updatedCollection.find((c) => c.id === itemId);
      if (updatedItem && selectedItem?.id === itemId) {
        setSelectedItem(updatedItem);
      }
    }
  };

  const handleEdit = (item: CollectionItem) => {
    setSelectedItem(null); // Close detail modal
    setEditingItem(item);
  };

  const handleSaveEdit = (itemData: Partial<CollectionItem>) => {
    if (editingItem) {
      const updatedCollection = storage.updateCollectionItem(editingItem.id, {
        ...itemData,
        comic: itemData.comic || editingItem.comic,
      });
      setCollection(updatedCollection);
      setEditingItem(null);
      showToast("Changes saved", "success");
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  if (!isLoaded) {
    return <CollectionPageSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Collection</h1>
          <p className="text-gray-600 mt-1">
            {stats.count} comics • ${stats.totalValue.toFixed(2)} total value
          </p>
        </div>
        <button
          onClick={() => router.push("/scan")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Comic
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Comics</p>
            <p className="text-xl font-bold text-gray-900">{stats.count}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <DollarSign className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Cost</p>
            <p className="text-xl font-bold text-gray-900">
              ${stats.totalCost.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Est. Value</p>
            <p className="text-xl font-bold text-gray-900">
              ${stats.totalValue.toFixed(2)}
            </p>
          </div>
        </div>
        <div className={`bg-white rounded-lg p-4 shadow-sm border flex items-center gap-4 ${
          profitLoss >= 0 ? "border-green-200" : "border-red-200"
        }`}>
          <div className={`p-3 rounded-lg flex-shrink-0 ${
            profitLoss >= 0 ? "bg-green-100" : "bg-red-100"
          }`}>
            {profitLoss >= 0 ? (
              <ArrowUpRight className="w-5 h-5 text-green-600" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500">Profit/Loss</p>
            <p className={`text-xl font-bold ${
              profitLoss >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {profitLoss >= 0 ? "+" : ""}${profitLoss.toFixed(2)}
            </p>
            {stats.totalCost > 0 && (
              <p className={`text-xs ${
                profitLoss >= 0 ? "text-green-500" : "text-red-500"
              }`}>
                {profitLossPercent >= 0 ? "+" : ""}{profitLossPercent.toFixed(1)}%
              </p>
            )}
          </div>
        </div>
        <div className={`bg-white rounded-lg p-4 shadow-sm border flex items-center gap-4 ${
          salesStats.totalProfit >= 0 ? "border-blue-200" : "border-gray-100"
        }`}>
          <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
            <Receipt className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500">Sales ({salesStats.totalSales})</p>
            <p className="text-xl font-bold text-gray-900">
              ${salesStats.totalRevenue.toFixed(2)}
            </p>
            {salesStats.totalProfit !== 0 && (
              <p className={`text-xs ${
                salesStats.totalProfit >= 0 ? "text-green-500" : "text-red-500"
              }`}>
                {salesStats.totalProfit >= 0 ? "+" : ""}${salesStats.totalProfit.toFixed(2)} profit
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedList === list.id
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {list.name}
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  selectedList === list.id
                    ? "bg-primary-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col gap-4">
          {/* Top Row - Search and View Toggle */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, publisher, writer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid View - Display comics as cover thumbnails"
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-white shadow-sm text-primary-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="List View - Display comics in a detailed table format"
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-white shadow-sm text-primary-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bottom Row - Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Starred Filter */}
            <button
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                showStarredOnly
                  ? "bg-yellow-100 border-yellow-300 text-yellow-700"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Star className={`w-4 h-4 ${showStarredOnly ? "fill-yellow-500 text-yellow-500" : ""}`} />
              Starred
            </button>

            {/* Publisher Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
                <Factory className="w-4 h-4" />
                Publisher:
              </label>
              <select
                value={publisherFilter}
                onChange={(e) => setPublisherFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-sm text-gray-900"
              >
                <option value="all">All</option>
                {uniquePublishers.map((publisher) => (
                  <option key={publisher} value={publisher}>
                    {publisher}
                  </option>
                ))}
              </select>
            </div>

            {/* Title Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
                <Book className="w-4 h-4" />
                Title:
              </label>
              <select
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-sm text-gray-900"
              >
                <option value="all">All</option>
                {uniqueTitles.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
                <SortAsc className="w-4 h-4" />
                Sort:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-sm text-gray-900"
              >
                <option value="date">Date Added</option>
                <option value="title">Title</option>
                <option value="value">Value</option>
                <option value="issue">Issue #</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(publisherFilter !== "all" || titleFilter !== "all" || showStarredOnly || searchQuery) && (
              <button
                onClick={() => {
                  setPublisherFilter("all");
                  setTitleFilter("all");
                  setShowStarredOnly(false);
                  setSearchQuery("");
                }}
                className="text-sm text-primary-600 hover:text-primary-700 underline"
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
                {selectedList !== "collection" ? "Scan a Comic" : "Add Your First Comic"}
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
              const estimatedValue = comic.priceData?.estimatedValue;
              const profitLoss = estimatedValue && item.purchasePrice
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
                      <img
                        src={item.coverImageUrl}
                        alt={`${comic.title} #${comic.issueNumber}`}
                        className="w-full h-full object-cover"
                      />
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
                    {estimatedValue ? (
                      <div>
                        <p className="font-medium text-gray-900">
                          ${estimatedValue.toFixed(2)}
                        </p>
                        {profitLoss !== null && (
                          <p className={`text-xs ${profitLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {profitLoss >= 0 ? "+" : ""}${profitLoss.toFixed(2)}
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
          onClose={handleCloseModal}
          onRemove={handleRemove}
          onAddToList={handleAddToList}
          onRemoveFromList={handleRemoveFromList}
          onCreateList={handleCreateList}
          onMarkSold={handleMarkSold}
          onToggleStar={handleToggleStar}
          onEdit={handleEdit}
        />
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCancelEdit} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex flex-col lg:flex-row max-h-[90vh]">
              {/* Image Preview */}
              <div className="lg:w-1/3 p-6 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-100">
                <div className="sticky top-6">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 shadow-lg">
                    <img
                      src={editingItem.coverImageUrl}
                      alt="Comic cover"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="lg:w-2/3 p-6 overflow-y-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
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
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
