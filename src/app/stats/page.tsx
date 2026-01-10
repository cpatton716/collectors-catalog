"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { storage } from "@/lib/storage";
import { CollectionItem, UserList } from "@/types/comic";
import { CollectionStats } from "@/components/CollectionStats";
import { ComicDetailModal } from "@/components/ComicDetailModal";
import { CollectionPageSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { ArrowLeft, BarChart3, RefreshCw } from "lucide-react";

export default function StatsPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useUser();
  const { showToast } = useToast();
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [lists, setLists] = useState<UserList[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);

  useEffect(() => {
    if (authLoaded && isSignedIn) {
      setCollection(storage.getCollection());
      setLists(storage.getLists());
    } else if (authLoaded && !isSignedIn) {
      setCollection([]);
      setLists([]);
    }
    if (authLoaded) {
      setIsLoaded(true);
    }
  }, [authLoaded, isSignedIn]);

  const handleRefresh = () => {
    setCollection(storage.getCollection());
    showToast("Statistics refreshed", "success");
  };

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
    setSelectedItem(null);
    showToast(`"${item?.comic.title}" removed from collection`, "success");
  };

  const handleAddToList = (itemId: string, listId: string) => {
    const updatedCollection = storage.addItemToList(itemId, listId);
    setCollection(updatedCollection);
    const list = lists.find((l) => l.id === listId);
    const item = updatedCollection.find((i) => i.id === itemId);
    showToast(`Added to "${list?.name}"`, "success");
    if (item) {
      setSelectedItem(item);
    }
  };

  const handleRemoveFromList = (itemId: string, listId: string) => {
    const updatedCollection = storage.removeItemFromList(itemId, listId);
    setCollection(updatedCollection);
    const list = lists.find((l) => l.id === listId);
    showToast(`Removed from "${list?.name}"`, "info");
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
      const updatedItem = updatedCollection.find((c) => c.id === itemId);
      if (updatedItem && selectedItem?.id === itemId) {
        setSelectedItem(updatedItem);
      }
    }
  };

  const handleEdit = (item: CollectionItem) => {
    // Navigate to collection page for editing
    router.push("/collection");
  };

  if (!isLoaded) {
    return <CollectionPageSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/collection")}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-primary-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Collection Statistics</h1>
            </div>
            <p className="text-gray-600 mt-1 ml-14">
              Detailed analytics and insights for your comic collection
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Stats Content */}
      <CollectionStats collection={collection} onComicClick={handleComicClick} />

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
    </div>
  );
}
