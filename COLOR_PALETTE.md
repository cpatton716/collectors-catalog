# Collectors Chest Color Palette

This document outlines the color palette used throughout the application. Update these values in `tailwind.config.ts` and `globals.css` to maintain consistent branding.

---

## Primary Brand Colors

The main brand color is **blue**. Defined in `tailwind.config.ts`:

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-50` | `#eff6ff` | Backgrounds, hover states |
| `primary-100` | `#dbeafe` | Light backgrounds, badges |
| `primary-200` | `#bfdbfe` | Borders, dividers |
| `primary-300` | `#93c5fd` | Disabled states |
| `primary-400` | `#60a5fa` | Icons, secondary elements |
| `primary-500` | `#3b82f6` | Focus rings, accents |
| `primary-600` | `#2563eb` | **Primary buttons, links** |
| `primary-700` | `#1d4ed8` | Button hover states |
| `primary-800` | `#1e40af` | Active states |
| `primary-900` | `#1e3a8a` | Dark accents |

---

## Semantic Colors

### Success (Green)
Used for: Confirmations, positive actions, profit indicators

| Token | Hex | Usage |
|-------|-----|-------|
| `green-50` | `#f0fdf4` | Success backgrounds |
| `green-100` | `#dcfce7` | Light success backgrounds |
| `green-500` | `#22c55e` | Success icons |
| `green-600` | `#16a34a` | Success text, buttons |
| `green-700` | `#15803d` | Dark success text |

### Warning (Amber/Yellow)
Used for: Alerts, Key Hunt, attention-grabbing elements

| Token | Hex | Usage |
|-------|-----|-------|
| `amber-50` | `#fffbeb` | Warning backgrounds |
| `amber-100` | `#fef3c7` | Light warning backgrounds |
| `amber-400` | `#fbbf24` | Warning accents |
| `amber-500` | `#f59e0b` | **Key Hunt primary** |
| `amber-600` | `#d97706` | Warning text, Key Hunt hover |
| `yellow-400` | `#facc15` | Professor accent color |

### Error (Red)
Used for: Errors, destructive actions, loss indicators

| Token | Hex | Usage |
|-------|-----|-------|
| `red-50` | `#fef2f2` | Error backgrounds |
| `red-100` | `#fee2e2` | Light error backgrounds |
| `red-500` | `#ef4444` | Error icons |
| `red-600` | `#dc2626` | Error text, delete buttons |
| `red-700` | `#b91c1c` | Dark error text |

---

## Neutral Colors (Grays)

Using Tailwind's default gray palette:

| Token | Hex | Usage |
|-------|-----|-------|
| `gray-50` | `#f9fafb` | Page backgrounds |
| `gray-100` | `#f3f4f6` | Card backgrounds, secondary buttons |
| `gray-200` | `#e5e7eb` | Borders, dividers |
| `gray-300` | `#d1d5db` | Input borders |
| `gray-400` | `#9ca3af` | Placeholder text, icons |
| `gray-500` | `#6b7280` | Secondary text |
| `gray-600` | `#4b5563` | Body text |
| `gray-700` | `#374151` | Headings, emphasis |
| `gray-800` | `#1f2937` | Dark text |
| `gray-900` | `#111827` | **Primary text, headings** |

---

## Feature-Specific Colors

### Key Hunt
- **Primary:** `amber-500` (`#f59e0b`)
- **Background:** `gray-900` (`#111827`)
- **Text:** White on dark background

### Ask the Professor
- **Background gradient:** `blue-700` to `blue-900`
- **Accent:** `yellow-400` (`#facc15`)
- **Icon ring:** `yellow-400`

### Hottest Books Banner
- **Gradient:** `orange-500` to `red-600`
- **Text:** White

### Price Indicators
- **Price up (good deal):** `green-600` with `green-50` background
- **Price down (cooling):** `red-600` with `red-50` background
- **Neutral:** `gray-600` with `gray-100` background

---

## Background Colors

Defined in `globals.css`:

```css
:root {
  --foreground-rgb: 0, 0, 0;           /* Black text */
  --background-start-rgb: 249, 250, 251; /* gray-50 */
  --background-end-rgb: 255, 255, 255;   /* white */
}
```

---

## Component Color Patterns

### Buttons
| Type | Background | Text | Border |
|------|------------|------|--------|
| Primary | `primary-600` | white | none |
| Secondary | `gray-100` | `gray-700` | `gray-200` |
| Ghost | transparent | `gray-600` | none |
| Destructive | `red-600` | white | none |

### Badges/Pills
| Type | Background | Text | Border |
|------|------------|------|--------|
| Default | `gray-100` | `gray-700` | none |
| Primary | `primary-50` | `primary-700` | `primary-200` |
| Success | `green-50` | `green-700` | `green-200` |
| Warning | `amber-50` | `amber-700` | `amber-200` |
| Error | `red-50` | `red-700` | `red-200` |

### Cards
- **Background:** white
- **Border:** `gray-100` or `gray-200`
- **Shadow:** `shadow-sm` or `shadow-md`

### Inputs
- **Background:** white
- **Border:** `gray-300`
- **Focus ring:** `primary-500`
- **Focus border:** `primary-500`

---

## How to Update Colors

### To change the primary brand color:

1. Open `tailwind.config.ts`
2. Replace the `primary` color object with your new palette
3. You can use [Tailwind CSS Color Generator](https://uicolors.app/create) to generate a full palette from a single hex color

### To change semantic colors:

Most semantic colors use Tailwind's built-in palettes (`green`, `amber`, `red`). To customize:

1. Add new color objects to `tailwind.config.ts` under `theme.extend.colors`
2. Update component classes throughout the codebase

### To change background colors:

1. Open `src/app/globals.css`
2. Update the CSS custom properties in `:root`

---

## Accessibility Notes

- Ensure color contrast ratios meet WCAG 2.1 AA standards (4.5:1 for normal text, 3:1 for large text)
- Don't rely solely on color to convey information
- Test with color blindness simulators
