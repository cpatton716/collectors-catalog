"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

const GUEST_SCAN_KEY = "comic_guest_scans";
const MILESTONES_SHOWN_KEY = "comic_milestones_shown";
const MAX_GUEST_SCANS = 10;

// Milestone thresholds
const HALFWAY_MILESTONE = 5;
const ALMOST_DONE_MILESTONE = 9;

export type MilestoneType = "halfway" | "almostDone" | "limitReached" | null;

interface MilestonesShown {
  halfway: boolean;
  almostDone: boolean;
  limitReached: boolean;
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
    return { halfway: false, almostDone: false, limitReached: false };
  }
  try {
    const stored = localStorage.getItem(MILESTONES_SHOWN_KEY);
    return stored ? JSON.parse(stored) : { halfway: false, almostDone: false, limitReached: false };
  } catch {
    return { halfway: false, almostDone: false, limitReached: false };
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
    halfway: false,
    almostDone: false,
    limitReached: false,
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

    if (scanCount >= MAX_GUEST_SCANS && !milestonesShown.limitReached) {
      return "limitReached";
    }
    if (scanCount >= ALMOST_DONE_MILESTONE && !milestonesShown.almostDone) {
      return "almostDone";
    }
    if (scanCount >= HALFWAY_MILESTONE && !milestonesShown.halfway) {
      return "halfway";
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

    if (newCount >= MAX_GUEST_SCANS && !currentMilestones.limitReached) {
      return "limitReached";
    }
    if (newCount >= ALMOST_DONE_MILESTONE && !currentMilestones.almostDone) {
      return "almostDone";
    }
    if (newCount >= HALFWAY_MILESTONE && !currentMilestones.halfway) {
      return "halfway";
    }

    return null;
  }, [scanCount, isSignedIn]);

  const resetScans = useCallback(() => {
    if (typeof window === "undefined") return;
    setScanCount(0);
    localStorage.removeItem(GUEST_SCAN_KEY);
    // Also reset milestones
    setMilestonesShown({ halfway: false, almostDone: false, limitReached: false });
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
