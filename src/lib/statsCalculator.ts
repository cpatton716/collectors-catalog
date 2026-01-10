import { CollectionItem } from "@/types/comic";
import { getComicValue } from "./gradePrice";

export interface CollectionOverview {
  totalCount: number;
  totalValue: number;
  averageValue: number;
  highestValueComic: CollectionItem | null;
  lowestValueComic: CollectionItem | null;
  pricedCount: number;
  unpricedCount: number;
}

export interface PublisherStats {
  publisher: string;
  count: number;
  value: number;
  percentage: number;
}

export interface DecadeStats {
  decade: string;
  count: number;
  value: number;
  percentage: number;
}

export interface GradingStats {
  rawCount: number;
  slabbedCount: number;
  cgcCount: number;
  cbcsCount: number;
  pgxCount: number;
  otherGradedCount: number;
  gradeDistribution: { grade: string; count: number }[];
}

export interface FinancialStats {
  totalPurchaseCost: number;
  totalEstimatedValue: number;
  unrealizedGainLoss: number;
  roiPercentage: number;
  comicsWithCost: number;
  comicsWithValue: number;
}

export interface KeyComicStats {
  keyCount: number;
  topKeyComics: CollectionItem[];
}

/**
 * Calculate collection overview statistics
 */
export function calculateOverviewStats(collection: CollectionItem[]): CollectionOverview {
  let totalValue = 0;
  let pricedCount = 0;
  let unpricedCount = 0;
  let highestValue = 0;
  let lowestValue = Infinity;
  let highestValueComic: CollectionItem | null = null;
  let lowestValueComic: CollectionItem | null = null;

  for (const item of collection) {
    const value = getComicValue(item);
    if (value > 0) {
      totalValue += value;
      pricedCount++;

      if (value > highestValue) {
        highestValue = value;
        highestValueComic = item;
      }
      if (value < lowestValue) {
        lowestValue = value;
        lowestValueComic = item;
      }
    } else {
      unpricedCount++;
    }
  }

  return {
    totalCount: collection.length,
    totalValue,
    averageValue: pricedCount > 0 ? totalValue / pricedCount : 0,
    highestValueComic,
    lowestValueComic: lowestValue === Infinity ? null : lowestValueComic,
    pricedCount,
    unpricedCount,
  };
}

/**
 * Calculate statistics by publisher
 */
export function calculatePublisherStats(collection: CollectionItem[]): PublisherStats[] {
  const publisherMap = new Map<string, { count: number; value: number }>();

  for (const item of collection) {
    const publisher = item.comic.publisher || "Unknown";
    const value = getComicValue(item);

    const existing = publisherMap.get(publisher) || { count: 0, value: 0 };
    existing.count++;
    existing.value += value;
    publisherMap.set(publisher, existing);
  }

  const totalValue = Array.from(publisherMap.values()).reduce((sum, p) => sum + p.value, 0);

  const stats: PublisherStats[] = Array.from(publisherMap.entries())
    .map(([publisher, data]) => ({
      publisher,
      count: data.count,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return stats;
}

/**
 * Get top N publishers by value
 */
export function getTopPublishers(collection: CollectionItem[], limit: number = 5): PublisherStats[] {
  return calculatePublisherStats(collection).slice(0, limit);
}

/**
 * Calculate statistics by decade
 */
export function calculateDecadeStats(collection: CollectionItem[]): DecadeStats[] {
  const decadeMap = new Map<string, { count: number; value: number }>();

  for (const item of collection) {
    const year = item.comic.releaseYear ? parseInt(item.comic.releaseYear) : null;
    let decade: string;

    if (!year || isNaN(year)) {
      decade = "Unknown";
    } else {
      const decadeStart = Math.floor(year / 10) * 10;
      decade = `${decadeStart}s`;
    }

    const value = getComicValue(item);
    const existing = decadeMap.get(decade) || { count: 0, value: 0 };
    existing.count++;
    existing.value += value;
    decadeMap.set(decade, existing);
  }

  const totalValue = Array.from(decadeMap.values()).reduce((sum, d) => sum + d.value, 0);

  const stats: DecadeStats[] = Array.from(decadeMap.entries())
    .map(([decade, data]) => ({
      decade,
      count: data.count,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => {
      // Sort by decade (Unknown last)
      if (a.decade === "Unknown") return 1;
      if (b.decade === "Unknown") return -1;
      return a.decade.localeCompare(b.decade);
    });

  return stats;
}

/**
 * Calculate grading statistics
 */
export function calculateGradingStats(collection: CollectionItem[]): GradingStats {
  let rawCount = 0;
  let slabbedCount = 0;
  let cgcCount = 0;
  let cbcsCount = 0;
  let pgxCount = 0;
  let otherGradedCount = 0;

  const gradeMap = new Map<string, number>();

  for (const item of collection) {
    if (item.isGraded || item.comic.isSlabbed) {
      slabbedCount++;

      const company = item.gradingCompany || item.comic.gradingCompany;
      switch (company?.toUpperCase()) {
        case "CGC":
          cgcCount++;
          break;
        case "CBCS":
          cbcsCount++;
          break;
        case "PGX":
          pgxCount++;
          break;
        default:
          if (company) otherGradedCount++;
          break;
      }

      // Track grade distribution
      const grade = item.comic.grade || (item.conditionGrade ? item.conditionGrade.toString() : null);
      if (grade) {
        const gradeKey = grade.toString();
        gradeMap.set(gradeKey, (gradeMap.get(gradeKey) || 0) + 1);
      }
    } else {
      rawCount++;
    }
  }

  const gradeDistribution = Array.from(gradeMap.entries())
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => parseFloat(b.grade) - parseFloat(a.grade));

  return {
    rawCount,
    slabbedCount,
    cgcCount,
    cbcsCount,
    pgxCount,
    otherGradedCount,
    gradeDistribution,
  };
}

/**
 * Calculate financial statistics
 */
export function calculateFinancialStats(collection: CollectionItem[]): FinancialStats {
  let totalPurchaseCost = 0;
  let totalEstimatedValue = 0;
  let comicsWithCost = 0;
  let comicsWithValue = 0;

  for (const item of collection) {
    if (item.purchasePrice && item.purchasePrice > 0) {
      totalPurchaseCost += item.purchasePrice;
      comicsWithCost++;
    }

    const value = getComicValue(item);
    if (value > 0) {
      totalEstimatedValue += value;
      comicsWithValue++;
    }
  }

  const unrealizedGainLoss = totalEstimatedValue - totalPurchaseCost;
  const roiPercentage = totalPurchaseCost > 0 ? (unrealizedGainLoss / totalPurchaseCost) * 100 : 0;

  return {
    totalPurchaseCost,
    totalEstimatedValue,
    unrealizedGainLoss,
    roiPercentage,
    comicsWithCost,
    comicsWithValue,
  };
}

/**
 * Calculate key comics statistics
 */
export function calculateKeyComicStats(collection: CollectionItem[], limit: number = 5): KeyComicStats {
  const keyComics = collection.filter(
    (item) => item.comic.keyInfo && item.comic.keyInfo.length > 0
  );

  // Sort by value descending
  const topKeyComics = [...keyComics]
    .sort((a, b) => getComicValue(b) - getComicValue(a))
    .slice(0, limit);

  return {
    keyCount: keyComics.length,
    topKeyComics,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return value.toFixed(1);
}
