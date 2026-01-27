"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@clerk/nextjs";

const GUEST_SCAN_KEY = "comic_guest_scans";
const MILESTONES_SHOWN_KEY = "comic_milestones_shown";
const BONUS_SCANS_KEY = "comic_bonus_scans";
const MAX_GUEST_SCANS = 5; // Guest limit: 5 scans (Free tier gets 10/month)
const BONUS_SCAN_AMOUNT = 5; // Bonus scans granted for email capture

// Milestone thresholds (adjusted for 5 scan limit)
const FIRST_MILESTONE = 2; // After 2nd scan (3 remaining)
const SECOND_MILESTONE = 3; // After 3rd scan (2 remaining)
const FINAL_MILESTONE = 4; // After 4th scan (1 remaining - next is their last)

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
  bonusScans: number;
  hasBonusScans: boolean;
  totalLimit: number;
  incrementScan: () => MilestoneType;
  resetScans: () => void;
  checkMilestone: () => MilestoneType;
  markMilestoneShown: (milestone: MilestoneType) => void;
  addBonusScans: () => void;
}

// Helper to get milestones from localStorage
const getMilestonesShown = (): MilestonesShown => {
  if (typeof window === "undefined") {
    return { fiveRemaining: false, threeRemaining: false, finalScan: false };
  }
  try {
    const stored = localStorage.getItem(MILESTONES_SHOWN_KEY);
    return stored
      ? JSON.parse(stored)
      : { fiveRemaining: false, threeRemaining: false, finalScan: false };
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
  const [bonusScans, setBonusScans] = useState(0);
  const [milestonesShown, setMilestonesShown] = useState<MilestonesShown>({
    fiveRemaining: false,
    threeRemaining: false,
    finalScan: false,
  });

  // Load scan count, bonus scans, and milestones from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(GUEST_SCAN_KEY);
    if (stored) {
      setScanCount(parseInt(stored, 10));
    }
    const storedBonus = localStorage.getItem(BONUS_SCANS_KEY);
    if (storedBonus) {
      setBonusScans(parseInt(storedBonus, 10));
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
  const markMilestoneShown = useCallback(
    (milestone: MilestoneType) => {
      if (!milestone) return;

      const updated = { ...milestonesShown, [milestone]: true };
      setMilestonesShown(updated);
      saveMilestonesShown(updated);
    },
    [milestonesShown]
  );

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
    setBonusScans(0);
    localStorage.removeItem(GUEST_SCAN_KEY);
    localStorage.removeItem(BONUS_SCANS_KEY);
    // Also reset milestones
    setMilestonesShown({ fiveRemaining: false, threeRemaining: false, finalScan: false });
    localStorage.removeItem(MILESTONES_SHOWN_KEY);
  }, []);

  // Add bonus scans (called after successful email capture)
  const addBonusScans = useCallback(() => {
    if (typeof window === "undefined") return;
    const newBonusScans = bonusScans + BONUS_SCAN_AMOUNT;
    setBonusScans(newBonusScans);
    localStorage.setItem(BONUS_SCANS_KEY, newBonusScans.toString());
  }, [bonusScans]);

  const isGuest = isLoaded && !isSignedIn;
  const totalLimit = MAX_GUEST_SCANS + bonusScans;
  const remaining = Math.max(0, totalLimit - scanCount);
  const isLimitReached = isGuest && scanCount >= totalLimit;
  const hasBonusScans = bonusScans > 0;

  return {
    count: scanCount,
    remaining,
    isLimitReached,
    isGuest,
    bonusScans,
    hasBonusScans,
    totalLimit,
    incrementScan,
    resetScans,
    checkMilestone,
    markMilestoneShown,
    addBonusScans,
  };
}

// Helper to check if guest has scans remaining (for use in components)
export function getGuestScansRemaining(): number {
  if (typeof window === "undefined") return MAX_GUEST_SCANS;
  const stored = localStorage.getItem(GUEST_SCAN_KEY);
  const storedBonus = localStorage.getItem(BONUS_SCANS_KEY);
  const count = stored ? parseInt(stored, 10) : 0;
  const bonus = storedBonus ? parseInt(storedBonus, 10) : 0;
  const totalLimit = MAX_GUEST_SCANS + bonus;
  return Math.max(0, totalLimit - count);
}

// Helper to check if guest has already redeemed bonus scans
export function hasRedeemedBonusScans(): boolean {
  if (typeof window === "undefined") return false;
  const storedBonus = localStorage.getItem(BONUS_SCANS_KEY);
  return storedBonus !== null && parseInt(storedBonus, 10) > 0;
}
