/**
 * Custom SVG Icons for Collectors Chest
 *
 * Icon Specifications:
 * - viewBox: "0 0 24 24" (standard)
 * - stroke-width: 2 (default), 2.5 (active states)
 * - stroke-linecap: "round"
 * - stroke-linejoin: "round"
 * - fill: "none" (outline style to match Lucide)
 *
 * Size Classes (Tailwind):
 * - w-3 h-3 (12px) - Tiny indicators
 * - w-4 h-4 (16px) - Small UI elements
 * - w-5 h-5 (20px) - Standard (most common)
 * - w-6 h-6 (24px) - Navigation
 * - w-8 h-8 (32px) - Modal titles
 * - w-12 h-12 (48px) - Component headers
 * - w-16 h-16 (64px) - Large modal icons
 *
 * Usage:
 * import { TreasureChest } from "@/components/icons";
 * <TreasureChest className="w-6 h-6 text-primary-600" />
 */
import { SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Treasure Chest Icon - Brand icon for Collectors Chest
 * Use for: Logo, favicon, branding elements
 */
export function TreasureChest({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* TODO: Replace with custom treasure chest path */}
      {/* Placeholder: simple chest shape */}
      <rect x="2" y="10" width="20" height="10" rx="2" />
      <path d="M2 14h20" />
      <path d="M12 14v-2" />
      <circle cx="12" cy="12" r="1" />
      <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M4 6c0-1 1-2 2-2h12c1 0 2 1 2 2" />
    </svg>
  );
}

/**
 * Template for creating new icons
 * Copy this template and modify the paths
 */
export function IconTemplate({ className = "w-6 h-6", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Add SVG paths here */}
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
