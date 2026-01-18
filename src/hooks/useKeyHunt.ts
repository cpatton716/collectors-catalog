"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

export interface KeyHuntItem {
  id: string;
  title: string;
  issueNumber: string;
  publisher?: string;
  releaseYear?: string;
  coverImageUrl?: string;
  keyInfo: string[];
  targetPriceLow?: number;
  targetPriceHigh?: number;
  currentPriceLow?: number;
  currentPriceMid?: number;
  currentPriceHigh?: number;
  pricesUpdatedAt?: string;
  notes?: string;
  priority: number;
  addedFrom: string;
  notifyPriceDrop: boolean;
  notifyThreshold?: number;
  createdAt: string;
}

export interface AddToKeyHuntParams {
  title: string;
  issueNumber: string;
  publisher?: string;
  releaseYear?: string;
  coverImageUrl?: string;
  keyInfo?: string[];
  currentPriceLow?: number;
  currentPriceMid?: number;
  currentPriceHigh?: number;
  notes?: string;
  priority?: number;
  addedFrom?: "hot_books" | "scan" | "key_hunt" | "manual";
}

export function useKeyHunt() {
  const { isSignedIn, isLoaded } = useUser();
  const [items, setItems] = useState<KeyHuntItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Key Hunt list
  const fetchList = useCallback(async () => {
    if (!isSignedIn) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/key-hunt");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch list");
      }

      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch list");
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  // Load list on mount
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchList();
    }
  }, [isLoaded, isSignedIn, fetchList]);

  // Add to Key Hunt list
  const addToKeyHunt = useCallback(
    async (params: AddToKeyHuntParams): Promise<{ success: boolean; error?: string; item?: KeyHuntItem }> => {
      if (!isSignedIn) {
        return { success: false, error: "Please sign in to add to your Key Hunt list" };
      }

      try {
        const response = await fetch("/api/key-hunt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 409) {
            return { success: false, error: "Already in your Key Hunt list" };
          }
          return { success: false, error: data.error || "Failed to add to list" };
        }

        // Add to local state
        if (data.item) {
          setItems((prev) => [data.item, ...prev]);
        }

        return { success: true, item: data.item };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Failed to add" };
      }
    },
    [isSignedIn]
  );

  // Remove from Key Hunt list
  const removeFromKeyHunt = useCallback(
    async (itemId: string): Promise<{ success: boolean; error?: string }> => {
      if (!isSignedIn) {
        return { success: false, error: "Please sign in" };
      }

      try {
        const response = await fetch(`/api/key-hunt?id=${itemId}`, {
          method: "DELETE",
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.error || "Failed to remove" };
        }

        // Remove from local state
        setItems((prev) => prev.filter((item) => item.id !== itemId));

        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Failed to remove" };
      }
    },
    [isSignedIn]
  );

  // Update Key Hunt item
  const updateKeyHuntItem = useCallback(
    async (
      itemId: string,
      updates: Partial<Pick<KeyHuntItem, "targetPriceLow" | "targetPriceHigh" | "notes" | "priority" | "notifyPriceDrop" | "notifyThreshold">>
    ): Promise<{ success: boolean; error?: string }> => {
      if (!isSignedIn) {
        return { success: false, error: "Please sign in" };
      }

      try {
        const response = await fetch("/api/key-hunt", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: itemId, ...updates }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.error || "Failed to update" };
        }

        // Update local state
        if (data.item) {
          setItems((prev) =>
            prev.map((item) => (item.id === itemId ? data.item : item))
          );
        }

        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Failed to update" };
      }
    },
    [isSignedIn]
  );

  // Check if a book is in the Key Hunt list
  const isInKeyHunt = useCallback(
    (title: string, issueNumber: string): boolean => {
      const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      return items.some(
        (item) =>
          item.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim() === normalizedTitle &&
          item.issueNumber === issueNumber
      );
    },
    [items]
  );

  // Get a specific item from Key Hunt list
  const getKeyHuntItem = useCallback(
    (title: string, issueNumber: string): KeyHuntItem | undefined => {
      const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      return items.find(
        (item) =>
          item.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim() === normalizedTitle &&
          item.issueNumber === issueNumber
      );
    },
    [items]
  );

  return {
    items,
    isLoading,
    error,
    isSignedIn: isSignedIn ?? false,
    fetchList,
    addToKeyHunt,
    removeFromKeyHunt,
    updateKeyHuntItem,
    isInKeyHunt,
    getKeyHuntItem,
    count: items.length,
  };
}
