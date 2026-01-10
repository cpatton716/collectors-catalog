"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

const GUEST_SCAN_KEY = "comic_guest_scans";
const MILESTONES_SHOWN_KEY = "comic_milestones_shown";
const MAX_GUEST_SCANS = 10;

// Milestone thresholds
const FIRST_MILESTONE = 5;   // After 5th scan (5 remaining)
const SECOND_MILESTONE = 7;  // After 7th scan (3 remaining)
const FINAL_MILESTONE = 9;   // After 9th scan (1 remaining - next is their last)

export type MilestoneType = "fiveRemaining" | "threeRemaining" | "finalScan" | null;

interface MilestonesShown {
  fiveRemaining: boolean;
  threeRemaining: boolean;
  finalScan: boolean;
}

interface GuestScanState {
  count: number;
  remaining: number;
  isLimitReached: boolean;
  isGuest: boolean;
  incrementScan: () => MilestoneType;
  resetScans: () => void;
  checkMilestone: () => MilestoneType;
  markMilestoneShown: (milestone: MilestoneType) => void;
}

// Helper to get milestones from localStorage
const getMilestonesShown = (): MilestonesShown => {
  if (typeof window === "undefined") {
    return { fiveRemaining: false, threeRemaining: false, finalScan: false };
  }
  try {
    const stored = localStorage.getItem(MILESTONES_SHOWN_KEY);
    return stored ? JSON.parse(stored) : { fiveRemaining: false, threeRemaining: false, finalScan: false };
  } catch {
    return { fiveRemaining: false, threeRemaining: false, finalScan: false };
  }
};

// Helper to save milestones to localStorage
const saveMilestonesShown = (milestones: MilestonesShown) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(MILESTONES_SHOWN_KEY, JSON.stringify(milestones));
};

export function useGuestScans(): GuestScanState {
  const { isSignedIn, isLoaded } = useAuth();
  const [scanCount, setScanCount] = useState(0);
  const [milestonesShown, setMilestonesShown] = useState<MilestonesShown>({
    fiveRemaining: false,
    threeRemaining: false,
    finalScan: false,
  });

  // Load scan count and milestones from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(GUEST_SCAN_KEY);
    if (stored) {
      setScanCount(parseInt(stored, 10));
    }
    setMilestonesShown(getMilestonesShown());
  }, []);

  // Check which milestone should be shown based on current count
  const checkMilestone = useCallback((): MilestoneType => {
    // Don't show milestones for signed-in users
    if (isSignedIn) return null;

    if (scanCount >= FINAL_MILESTONE && !milestonesShown.finalScan) {
      return "finalScan";
    }
    if (scanCount >= SECOND_MILESTONE && !milestonesShown.threeRemaining) {
      return "threeRemaining";
    }
    if (scanCount >= FIRST_MILESTONE && !milestonesShown.fiveRemaining) {
      return "fiveRemaining";
    }
    return null;
  }, [scanCount, milestonesShown, isSignedIn]);

  // Mark a milestone as shown
  const markMilestoneShown = useCallback((milestone: MilestoneType) => {
    if (!milestone) return;

    const updated = { ...milestonesShown, [milestone]: true };
    setMilestonesShown(updated);
    saveMilestonesShown(updated);
  }, [milestonesShown]);

  // Increment scan and return any milestone that should be shown
  const incrementScan = useCallback((): MilestoneType => {
    if (typeof window === "undefined") return null;
    // Don't count scans for signed-in users
    if (isSignedIn) return null;

    const newCount = scanCount + 1;
    setScanCount(newCount);
    localStorage.setItem(GUEST_SCAN_KEY, newCount.toString());

    // Check for milestones based on NEW count
    const currentMilestones = getMilestonesShown();

    if (newCount >= FINAL_MILESTONE && !currentMilestones.finalScan) {
      return "finalScan";
    }
    if (newCount >= SECOND_MILESTONE && !currentMilestones.threeRemaining) {
      return "threeRemaining";
    }
    if (newCount >= FIRST_MILESTONE && !currentMilestones.fiveRemaining) {
      return "fiveRemaining";
    }

    return null;
  }, [scanCount, isSignedIn]);

  const resetScans = useCallback(() => {
    if (typeof window === "undefined") return;
    setScanCount(0);
    localStorage.removeItem(GUEST_SCAN_KEY);
    // Also reset milestones
    setMilestonesShown({ fiveRemaining: false, threeRemaining: false, finalScan: false });
    localStorage.removeItem(MILESTONES_SHOWN_KEY);
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
    checkMilestone,
    markMilestoneShown,
  };
}

// Helper to check if guest has scans remaining (for use in components)
export function getGuestScansRemaining(): number {
  if (typeof window === "undefined") return MAX_GUEST_SCANS;
  const stored = localStorage.getItem(GUEST_SCAN_KEY);
  const count = stored ? parseInt(stored, 10) : 0;
  return Math.max(0, MAX_GUEST_SCANS - count);
}
