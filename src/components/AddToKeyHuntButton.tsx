"use client";

import { useState } from "react";
import { Target, Check, Loader2, LogIn } from "lucide-react";
import { useKeyHunt, AddToKeyHuntParams } from "@/hooks/useKeyHunt";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

interface AddToKeyHuntButtonProps {
  title: string;
  issueNumber: string;
  publisher?: string;
  releaseYear?: string;
  coverImageUrl?: string;
  keyInfo?: string[];
  currentPriceLow?: number;
  currentPriceMid?: number;
  currentPriceHigh?: number;
  addedFrom?: "hot_books" | "scan" | "key_hunt" | "manual";
  variant?: "default" | "compact" | "icon";
  className?: string;
  onAdded?: () => void;
}

export function AddToKeyHuntButton({
  title,
  issueNumber,
  publisher,
  releaseYear,
  coverImageUrl,
  keyInfo,
  currentPriceLow,
  currentPriceMid,
  currentPriceHigh,
  addedFrom = "manual",
  variant = "default",
  className = "",
  onAdded,
}: AddToKeyHuntButtonProps) {
  const { isSignedIn } = useUser();
  const { addToKeyHunt, isInKeyHunt } = useKeyHunt();
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyInList = isInKeyHunt(title, issueNumber);

  const handleAdd = async () => {
    if (alreadyInList || justAdded || isAdding) return;

    setIsAdding(true);
    setError(null);

    const params: AddToKeyHuntParams = {
      title,
      issueNumber,
      publisher,
      releaseYear,
      coverImageUrl,
      keyInfo,
      currentPriceLow,
      currentPriceMid,
      currentPriceHigh,
      addedFrom,
    };

    const result = await addToKeyHunt(params);

    setIsAdding(false);

    if (result.success) {
      setJustAdded(true);
      onAdded?.();
      // Reset after 3 seconds
      setTimeout(() => setJustAdded(false), 3000);
    } else {
      setError(result.error || "Failed to add");
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  };

  // Not signed in - show sign in prompt
  if (!isSignedIn) {
    if (variant === "icon") {
      return (
        <Link
          href="/sign-in"
          className={`p-2 text-gray-400 hover:text-primary-600 transition-colors ${className}`}
          title="Sign in to add to Key Hunt"
        >
          <LogIn className="w-5 h-5" />
        </Link>
      );
    }

    return (
      <Link
        href="/sign-in"
        className={`
          inline-flex items-center gap-2 px-3 py-2
          bg-gray-100 text-gray-600 rounded-lg
          hover:bg-gray-200 transition-colors text-sm
          ${className}
        `}
      >
        <LogIn className="w-4 h-4" />
        {variant === "compact" ? "Sign in" : "Sign in to add to Key Hunt"}
      </Link>
    );
  }

  // Already in list
  if (alreadyInList || justAdded) {
    if (variant === "icon") {
      return (
        <button
          disabled
          className={`p-2 text-green-600 cursor-default ${className}`}
          title="In your Key Hunt list"
        >
          <Check className="w-5 h-5" />
        </button>
      );
    }

    return (
      <button
        disabled
        className={`
          inline-flex items-center gap-2 px-3 py-2
          bg-green-100 text-green-700 rounded-lg
          cursor-default text-sm
          ${className}
        `}
      >
        <Check className="w-4 h-4" />
        {variant === "compact" ? "Added" : "In Key Hunt"}
      </button>
    );
  }

  // Error state
  if (error) {
    return (
      <button
        disabled
        className={`
          inline-flex items-center gap-2 px-3 py-2
          bg-red-100 text-red-700 rounded-lg
          cursor-default text-sm
          ${className}
        `}
      >
        {error}
      </button>
    );
  }

  // Default add button
  if (variant === "icon") {
    return (
      <button
        onClick={handleAdd}
        disabled={isAdding}
        className={`
          p-2 text-gray-400 hover:text-amber-600
          transition-colors disabled:opacity-50
          ${className}
        `}
        title="Add to Key Hunt"
      >
        {isAdding ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Target className="w-5 h-5" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      disabled={isAdding}
      className={`
        inline-flex items-center gap-2 px-3 py-2
        bg-amber-100 text-amber-700 rounded-lg
        hover:bg-amber-200 transition-colors text-sm
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isAdding ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Adding...
        </>
      ) : (
        <>
          <Target className="w-4 h-4" />
          {variant === "compact" ? "Key Hunt" : "Add to Key Hunt"}
        </>
      )}
    </button>
  );
}
