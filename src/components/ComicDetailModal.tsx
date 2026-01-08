"use client";

import { useState } from "react";
import { CollectionItem, UserList, GRADE_SCALE } from "@/types/comic";
import {
  X,
  Trash2,
  ListPlus,
  Tag,
  DollarSign,
  TrendingUp,
  Info,
  Calendar,
  User,
  Building,
  Palette,
  PenTool,
  Award,
  Plus,
  Check,
  Star,
  Pencil,
} from "lucide-react";

interface ComicDetailModalProps {
  item: CollectionItem;
  lists: UserList[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onAddToList: (itemId: string, listId: string) => void;
  onRemoveFromList: (itemId: string, listId: string) => void;
  onCreateList: (name: string) => UserList;
  onMarkSold: (itemId: string, salePrice: number, buyerId?: string) => void;
  onToggleStar: (itemId: string) => void;
  onEdit: (item: CollectionItem) => void;
}

export function ComicDetailModal({
  item,
  lists,
  onClose,
  onRemove,
  onAddToList,
  onRemoveFromList,
  onCreateList,
  onMarkSold,
  onToggleStar,
  onEdit,
}: ComicDetailModalProps) {
  const [showListMenu, setShowListMenu] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showSoldConfirm, setShowSoldConfirm] = useState(false);
  const [salePrice, setSalePrice] = useState<string>(
    item.askingPrice?.toString() || item.comic.priceData?.estimatedValue?.toString() || ""
  );

  const { comic } = item;

  // Get custom lists (non-default)
  const customLists = lists.filter((l) => !l.isDefault);
  const hasCustomLists = customLists.length > 0;

  // Get grade label
  const gradeLabel = item.conditionGrade
    ? GRADE_SCALE.find((g) => g.value === item.conditionGrade?.toString())?.label ||
      `${item.conditionGrade}`
    : null;

  const handleCreateList = () => {
    if (newListName.trim()) {
      const newList = onCreateList(newListName.trim());
      onAddToList(item.id, newList.id);
      setNewListName("");
      setShowCreateList(false);
      setShowListMenu(false);
    }
  };

  const handleRemove = () => {
    onRemove(item.id);
    onClose();
  };

  const handleMarkSold = () => {
    const price = parseFloat(salePrice);
    if (isNaN(price) || price <= 0) {
      return; // Don't proceed without a valid price
    }
    onMarkSold(item.id, price);
    onClose();
  };

  const isInList = (listId: string) => item.listIds.includes(listId);

  const toggleList = (listId: string) => {
    if (isInList(listId)) {
      onRemoveFromList(item.id, listId);
    } else {
      onAddToList(item.id, listId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/90 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex flex-col md:flex-row max-h-[90vh]">
          {/* Cover Image */}
          <div className="md:w-1/3 bg-gray-100 p-6 flex items-center justify-center">
            <div className="aspect-[2/3] w-full max-w-[250px] rounded-lg overflow-hidden shadow-lg">
              <img
                src={item.coverImageUrl}
                alt={`${comic.title} #${comic.issueNumber}`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Details */}
          <div className="md:w-2/3 p-6 overflow-y-auto">
            {/* Header */}
            <div className="mb-6 pr-10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {comic.title || "Unknown Title"}
                  </h2>
                  <p className="text-lg text-gray-600">
                    Issue #{comic.issueNumber || "?"}
                    {comic.variant && (
                      <span className="text-gray-400 ml-2">({comic.variant})</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => onToggleStar(item.id)}
                  className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                    item.isStarred
                      ? "bg-yellow-100 text-yellow-500 hover:bg-yellow-200"
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-yellow-500"
                  }`}
                  title={item.isStarred ? "Remove from favorites" : "Add to favorites"}
                >
                  <Star className={`w-6 h-6 ${item.isStarred ? "fill-yellow-500" : ""}`} />
                </button>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {item.isGraded && item.gradingCompany && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  {item.gradingCompany} {gradeLabel}
                </span>
              )}
              {item.forSale && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  For Sale - ${item.askingPrice?.toFixed(2)}
                </span>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Building className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Publisher:</span>
                <span className="font-medium text-gray-900">
                  {comic.publisher || "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Year:</span>
                <span className="font-medium text-gray-900">
                  {comic.releaseYear || "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <PenTool className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Writer:</span>
                <span className="font-medium text-gray-900">
                  {comic.writer || "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Palette className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Cover Artist:</span>
                <span className="font-medium text-gray-900">
                  {comic.coverArtist || "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Interior Artist:</span>
                <span className="font-medium text-gray-900">
                  {comic.interiorArtist || "Unknown"}
                </span>
              </div>
              {comic.isSignatureSeries && comic.signedBy && (
                <div className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="text-gray-600">Signed by:</span>
                  <span className="font-medium text-gray-900">{comic.signedBy}</span>
                </div>
              )}
            </div>

            {/* Value Section */}
            {comic.priceData && comic.priceData.estimatedValue && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      Estimated Value
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="text-2xl font-bold text-green-700">
                        {comic.priceData.estimatedValue.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    {comic.priceData.mostRecentSaleDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Most recent sale:{" "}
                        {new Date(comic.priceData.mostRecentSaleDate).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </p>
                    )}
                  </div>
                  {comic.priceData.recentSales.length > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Recent Sales</p>
                      <div className="space-y-0.5">
                        {comic.priceData.recentSales.slice(0, 3).map((sale, idx) => (
                          <p key={idx} className="text-xs text-gray-600">
                            ${sale.price.toLocaleString()}
                            <span className="text-gray-400 ml-1">
                              (
                              {new Date(sale.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                              )
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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

            {/* Purchase Info & Profit/Loss */}
            {item.purchasePrice && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Investment Summary
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Purchase Price:</span>
                    <span className="font-medium text-gray-900">
                      ${item.purchasePrice.toFixed(2)}
                    </span>
                  </div>
                  {comic.priceData?.estimatedValue && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Current Value:</span>
                        <span className="font-medium text-gray-900">
                          ${comic.priceData.estimatedValue.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t pt-2 flex justify-between text-sm">
                        <span className="text-gray-600 font-medium">Profit/Loss:</span>
                        {(() => {
                          const profitLoss = comic.priceData.estimatedValue - item.purchasePrice;
                          const profitPercent = (profitLoss / item.purchasePrice) * 100;
                          return (
                            <span className={`font-bold ${profitLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {profitLoss >= 0 ? "+" : ""}${profitLoss.toFixed(2)}
                              <span className="text-xs font-normal ml-1">
                                ({profitPercent >= 0 ? "+" : ""}{profitPercent.toFixed(1)}%)
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
                <p className="text-sm text-gray-600">{item.notes}</p>
              </div>
            )}

            {/* Lists */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">In Lists</h3>
              <div className="flex flex-wrap gap-2">
                {lists
                  .filter((l) => item.listIds.includes(l.id))
                  .map((list) => (
                    <span
                      key={list.id}
                      className={`px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs flex items-center gap-1 ${
                        list.id !== "collection" ? "pr-1" : ""
                      }`}
                    >
                      {list.name}
                      {list.id !== "collection" && (
                        <button
                          onClick={() => onRemoveFromList(item.id, list.id)}
                          className="ml-1 p-0.5 hover:bg-gray-200 rounded-full text-gray-500 hover:text-red-500 transition-colors"
                          title={`Remove from ${list.name}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              {/* Add to List Button */}
              <div className="relative">
                <button
                  onClick={() => setShowListMenu(!showListMenu)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                  <ListPlus className="w-4 h-4" />
                  Add to List
                </button>

                {/* List Menu Dropdown */}
                {showListMenu && (
                  <>
                    {/* Invisible overlay to close dropdown when clicking outside */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => {
                        setShowListMenu(false);
                        setShowCreateList(false);
                        setNewListName("");
                      }}
                    />
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    {!hasCustomLists && !showCreateList ? (
                      <div className="px-4 py-3 text-center">
                        <p className="text-sm text-gray-500 mb-3">
                          You don&apos;t have any custom lists yet.
                        </p>
                        <button
                          onClick={() => setShowCreateList(true)}
                          className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors flex items-center gap-1 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Create New List
                        </button>
                      </div>
                    ) : showCreateList ? (
                      <div className="px-3 py-2">
                        <input
                          type="text"
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          placeholder="List name..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 bg-white text-gray-900"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleCreateList}
                            disabled={!newListName.trim()}
                            className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            Create & Add
                          </button>
                          <button
                            onClick={() => {
                              setShowCreateList(false);
                              setNewListName("");
                            }}
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Default Lists */}
                        <div className="px-3 py-1">
                          <p className="text-xs text-gray-400 uppercase font-medium mb-1">
                            Default Lists
                          </p>
                          {lists
                            .filter((l) => l.isDefault && l.id !== "collection")
                            .map((list) => (
                              <button
                                key={list.id}
                                onClick={() => toggleList(list.id)}
                                className="w-full px-2 py-1.5 text-left text-sm text-gray-900 hover:bg-gray-100 rounded flex items-center justify-between"
                              >
                                <span>{list.name}</span>
                                {isInList(list.id) && (
                                  <Check className="w-4 h-4 text-green-600" />
                                )}
                              </button>
                            ))}
                        </div>

                        {/* Custom Lists */}
                        {customLists.length > 0 && (
                          <div className="px-3 py-1 border-t mt-1 pt-1">
                            <p className="text-xs text-gray-400 uppercase font-medium mb-1">
                              Custom Lists
                            </p>
                            {customLists.map((list) => (
                              <button
                                key={list.id}
                                onClick={() => toggleList(list.id)}
                                className="w-full px-2 py-1.5 text-left text-sm text-gray-900 hover:bg-gray-100 rounded flex items-center justify-between"
                              >
                                <span>{list.name}</span>
                                {isInList(list.id) && (
                                  <Check className="w-4 h-4 text-green-600" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Create New */}
                        <div className="border-t mt-1 pt-1 px-3">
                          <button
                            onClick={() => setShowCreateList(true)}
                            className="w-full px-2 py-1.5 text-left text-sm text-primary-600 hover:bg-primary-50 rounded flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Create New List
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  </>
                )}
              </div>

              {/* Edit Details Button */}
              <button
                onClick={() => onEdit(item)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit Details
              </button>

              {/* Mark as Sold Button (if for sale) */}
              {item.forSale && (
                <button
                  onClick={() => setShowSoldConfirm(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Mark as Sold
                </button>
              )}

              {/* Remove Button */}
              <button
                onClick={() => setShowRemoveConfirm(true)}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remove from Collection
              </button>
            </div>

            {/* Remove Confirmation */}
            {showRemoveConfirm && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 mb-3">
                  Are you sure you want to remove this comic from your collection?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRemove}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    Yes, Remove
                  </button>
                  <button
                    onClick={() => setShowRemoveConfirm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Sold Confirmation */}
            {showSoldConfirm && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 mb-3">
                  Enter the sale price to record this sale.
                </p>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sale Price ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                    placeholder="Enter sale price"
                  />
                  {item.purchasePrice && salePrice && parseFloat(salePrice) > 0 && (
                    <p className={`text-xs mt-1 ${
                      parseFloat(salePrice) >= item.purchasePrice ? "text-green-600" : "text-red-600"
                    }`}>
                      {parseFloat(salePrice) >= item.purchasePrice ? "Profit" : "Loss"}: $
                      {Math.abs(parseFloat(salePrice) - item.purchasePrice).toFixed(2)}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Note: In the future, you&apos;ll be able to select the buyer and the comic
                  will automatically transfer to their collection.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleMarkSold}
                    disabled={!salePrice || parseFloat(salePrice) <= 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Sale
                  </button>
                  <button
                    onClick={() => setShowSoldConfirm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Date Added */}
            <p className="text-xs text-gray-400 mt-4">
              Added to collection:{" "}
              {new Date(item.dateAdded).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
