import { GradeEstimate, PriceData } from "@/types/comic";

/**
 * Calculate the estimated value for a comic at a specific grade
 * Interpolates between grade estimates if the exact grade isn't available
 */
export function calculateValueAtGrade(
  priceData: PriceData | null,
  grade: number,
  isSlabbed: boolean = false
): number | null {
  if (!priceData?.gradeEstimates || priceData.gradeEstimates.length === 0) {
    // Fall back to base estimated value if no grade estimates
    return priceData?.estimatedValue ?? null;
  }

  const estimates = priceData.gradeEstimates;

  // Sort estimates by grade descending
  const sorted = [...estimates].sort((a, b) => b.grade - a.grade);

  // Find the two closest grades to interpolate between
  let lower: GradeEstimate | null = null;
  let upper: GradeEstimate | null = null;

  for (const est of sorted) {
    if (est.grade >= grade) {
      upper = est;
    } else {
      lower = est;
      break;
    }
  }

  // Get the appropriate value (raw or slabbed)
  const getValue = (est: GradeEstimate) => isSlabbed ? est.slabbedValue : est.rawValue;

  // Edge cases
  if (!upper && lower) {
    // Grade is higher than all estimates, use highest
    return getValue(sorted[0]);
  }
  if (!lower && upper) {
    // Grade is lower than all estimates, use lowest
    return getValue(sorted[sorted.length - 1]);
  }
  if (upper && lower) {
    // Interpolate between the two
    const range = upper.grade - lower.grade;
    const position = (grade - lower.grade) / range;
    const lowerValue = getValue(lower);
    const upperValue = getValue(upper);
    return Math.round((lowerValue + (upperValue - lowerValue) * position) * 100) / 100;
  }

  // Exact match found
  const exact = estimates.find(e => e.grade === grade);
  if (exact) {
    return getValue(exact);
  }

  return priceData.estimatedValue;
}

/**
 * Get the grade label for a numeric grade
 */
export function getGradeLabel(grade: number): string {
  if (grade >= 9.8) return "Near Mint/Mint";
  if (grade >= 9.4) return "Near Mint";
  if (grade >= 9.0) return "Very Fine/Near Mint";
  if (grade >= 8.0) return "Very Fine";
  if (grade >= 7.0) return "Fine/Very Fine";
  if (grade >= 6.0) return "Fine";
  if (grade >= 5.0) return "Very Good/Fine";
  if (grade >= 4.0) return "Very Good";
  if (grade >= 3.0) return "Good/Very Good";
  if (grade >= 2.0) return "Good";
  if (grade >= 1.0) return "Fair";
  return "Poor";
}

/**
 * Format a grade estimate for display
 */
export function formatGradeEstimate(estimate: GradeEstimate, showBoth: boolean = false): string {
  if (showBoth) {
    return `Raw: $${estimate.rawValue.toLocaleString()} | Slabbed: $${estimate.slabbedValue.toLocaleString()}`;
  }
  return `$${estimate.rawValue.toLocaleString()} raw / $${estimate.slabbedValue.toLocaleString()} slabbed`;
}

/**
 * Get a price comparison between current grade and another grade
 */
export function getPriceComparison(
  priceData: PriceData | null,
  currentGrade: number,
  compareGrade: number,
  isSlabbed: boolean = false
): { difference: number; percentage: number } | null {
  const currentValue = calculateValueAtGrade(priceData, currentGrade, isSlabbed);
  const compareValue = calculateValueAtGrade(priceData, compareGrade, isSlabbed);

  if (currentValue === null || compareValue === null) {
    return null;
  }

  const difference = compareValue - currentValue;
  const percentage = currentValue > 0 ? (difference / currentValue) * 100 : 0;

  return {
    difference: Math.round(difference * 100) / 100,
    percentage: Math.round(percentage * 10) / 10,
  };
}
