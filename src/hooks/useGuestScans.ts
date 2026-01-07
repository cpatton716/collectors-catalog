"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

const GUEST_SCAN_KEY = "comic_guest_scans";
const MAX_GUEST_SCANS = 10;

interface GuestScanState {
  count: number;
  remaining: number;
  isLimitReached: boolean;
  isGuest: boolean;
  incrementScan: () => void;
  resetScans: () => void;
}

export function useGuestScans(): GuestScanState {
  const { isSignedIn, isLoaded } = useAuth();
  const [scanCount, setScanCount] = useState(0);

  // Load scan count from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(GUEST_SCAN_KEY);
    if (stored) {
      setScanCount(parseInt(stored, 10));
    }
  }, []);

  const incrementScan = useCallback(() => {
    if (typeof window === "undefined") return;
    // Don't count scans for signed-in users
    if (isSignedIn) return;

    const newCount = scanCount + 1;
    setScanCount(newCount);
    localStorage.setItem(GUEST_SCAN_KEY, newCount.toString());
  }, [scanCount, isSignedIn]);

  const resetScans = useCallback(() => {
    if (typeof window === "undefined") return;
    setScanCount(0);
    localStorage.removeItem(GUEST_SCAN_KEY);
  }, []);

  const isGuest = isLoaded && !isSignedIn;
  const remaining = Math.max(0, MAX_GUEST_SCANS - scanCount);
  const isLimitReached = isGuest && scanCount >= MAX_GUEST_SCANS;

  return {
    count: scanCount,
    remaining,
    isLimitReached,
    isGuest,
    incrementScan,
    resetScans,
  };
}

// Helper to check if guest has scans remaining (for use in components)
export function getGuestScansRemaining(): number {
  if (typeof window === "undefined") return MAX_GUEST_SCANS;
  const stored = localStorage.getItem(GUEST_SCAN_KEY);
  const count = stored ? parseInt(stored, 10) : 0;
  return Math.max(0, MAX_GUEST_SCANS - count);
}
