"use client";

import { useEffect, useState } from "react";

import { useUser } from "@clerk/nextjs";

import { storage } from "@/lib/storage";

import { DataMigrationModal } from "./DataMigrationModal";

const MIGRATION_PROMPTED_KEY = "comic_migration_prompted";

export function AuthDataSync() {
  const { isSignedIn, isLoaded, user } = useUser();
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    // Check if we've already prompted this user for migration
    const promptedUsers = JSON.parse(localStorage.getItem(MIGRATION_PROMPTED_KEY) || "[]");
    if (promptedUsers.includes(user.id)) return;

    // Check if there's local data to potentially migrate
    const localComics = storage.getCollection();
    const localSales = storage.getSales();
    const localLists = storage.getLists().filter((l) => !l.isDefault);

    if (localComics.length > 0 || localSales.length > 0 || localLists.length > 0) {
      // Show migration modal
      setShowMigrationModal(true);
    } else {
      // No data to migrate, mark as prompted
      markAsPrompted(user.id);
    }
  }, [isLoaded, isSignedIn, user]);

  const markAsPrompted = (userId: string) => {
    const promptedUsers = JSON.parse(localStorage.getItem(MIGRATION_PROMPTED_KEY) || "[]");
    if (!promptedUsers.includes(userId)) {
      promptedUsers.push(userId);
      localStorage.setItem(MIGRATION_PROMPTED_KEY, JSON.stringify(promptedUsers));
    }
  };

  const handleMigrationComplete = () => {
    if (user) {
      markAsPrompted(user.id);
    }
    setShowMigrationModal(false);
  };

  return (
    <DataMigrationModal
      isOpen={showMigrationModal}
      onClose={() => {
        if (user) markAsPrompted(user.id);
        setShowMigrationModal(false);
      }}
      onComplete={handleMigrationComplete}
    />
  );
}
