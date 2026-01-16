---
description: Design system rules and color guidelines for Collectors Chest UI
triggers:
  - "design check"
  - "check design"
  - "color check"
  - "ui review"
---

# Skill: Design System Check

## Purpose

Enforce design consistency and prevent common issues like white text on white backgrounds.

## Color Palette

### Primary Colors (Blue)
| Class | Hex | Use For |
|-------|-----|---------|
| `primary-50` | #eff6ff | Light backgrounds |
| `primary-100` | #dbeafe | Hover states on light backgrounds |
| `primary-500` | #3b82f6 | Icons, accents |
| `primary-600` | #2563eb | **Primary buttons, links** |
| `primary-700` | #1d4ed8 | Hover on primary buttons |
| `primary-900` | #1e3a8a | Dark text accents |

### Accent Colors (Amber/Orange)
| Class | Hex | Use For |
|-------|-----|---------|
| `amber-500` | - | Premium/bonus highlights |
| `amber-600` | - | CTA buttons (bonus scans, etc.) |
| `orange-600` | - | Gradients with amber |

### Neutrals (Gray Scale)
| Class | Use For |
|-------|---------|
| `gray-50` | Subtle backgrounds (cards on white) |
| `gray-100` | Input backgrounds, dividers |
| `gray-200` | Borders |
| `gray-300` | Disabled states |
| `gray-400` | Icons, placeholder text |
| `gray-500` | Secondary text |
| `gray-600` | Body text |
| `gray-700` | Dark mode inputs |
| `gray-800` | Dark mode cards |
| `gray-900` | Headings, dark mode backgrounds |

---

## CRITICAL: Text/Background Combinations

### NEVER DO (White-on-White Problem)
```tsx
// BAD - white text invisible on white background
<div className="bg-white">
  <p className="text-white">Invisible text!</p>
</div>

// BAD - light text on light background
<div className="bg-gray-50">
  <p className="text-gray-200">Nearly invisible!</p>
</div>
```

### ALWAYS DO

#### On White/Light Backgrounds (`bg-white`, `bg-gray-50`, `bg-gray-100`)
```tsx
// Headings
<h1 className="text-gray-900">Dark heading</h1>

// Body text
<p className="text-gray-600">Standard body text</p>
<p className="text-gray-700">Slightly darker body</p>

// Secondary/muted text
<span className="text-gray-500">Muted text</span>
<span className="text-gray-400">Even more muted</span>

// Links
<a className="text-primary-600 hover:text-primary-700">Link text</a>
<a className="text-indigo-600 hover:text-indigo-700">Alt link style</a>

// Icons
<Icon className="text-gray-400" />  // Decorative
<Icon className="text-gray-500" />  // Actionable
```

#### On Dark Backgrounds (`bg-gray-800`, `bg-gray-900`, gradients)
```tsx
// Headings and primary text
<h1 className="text-white">White heading</h1>

// Body text
<p className="text-gray-100">Light body text</p>
<p className="text-gray-200">Slightly muted</p>

// Muted/secondary text
<span className="text-gray-300">Muted on dark</span>
<span className="text-gray-400">More muted</span>

// Icons
<Icon className="text-white" />       // Primary
<Icon className="text-gray-300" />    // Secondary
```

#### On Colored Backgrounds (`bg-primary-600`, `bg-amber-600`, gradients)
```tsx
// Always use white or very light text
<div className="bg-primary-600">
  <p className="text-white">White on primary</p>
  <p className="text-primary-100">Muted on primary</p>
</div>

<div className="bg-gradient-to-br from-amber-500 to-orange-600">
  <p className="text-white">White on gradient</p>
  <p className="text-amber-100">Muted on amber</p>
</div>
```

---

## Contrast Requirements

### Minimum Contrast Rules
| Element Type | Minimum Contrast | Example Combinations |
|--------------|------------------|---------------------|
| Body text | 4.5:1 | `text-gray-600` on `bg-white` |
| Large headings | 3:1 | `text-gray-700` on `bg-gray-50` |
| Interactive elements | 4.5:1 | `text-primary-600` on `bg-white` |
| Placeholder text | 3:1 | `text-gray-400` on `bg-white` |

### Quick Reference: Safe Combinations
| Background | Safe Text Colors |
|------------|-----------------|
| `bg-white` | `text-gray-600`, `text-gray-700`, `text-gray-900`, `text-primary-600` |
| `bg-gray-50` | `text-gray-600`, `text-gray-700`, `text-gray-900` |
| `bg-gray-100` | `text-gray-700`, `text-gray-900` |
| `bg-gray-800` | `text-white`, `text-gray-100`, `text-gray-200`, `text-gray-300` |
| `bg-gray-900` | `text-white`, `text-gray-100`, `text-gray-200` |
| `bg-primary-600` | `text-white`, `text-primary-100` |
| `bg-amber-600` | `text-white`, `text-amber-100` |

---

## Component Patterns

### Cards
```tsx
// Light card (most common)
<div className="bg-white rounded-xl shadow-sm border border-gray-200">
  <h3 className="text-gray-900">Card Title</h3>
  <p className="text-gray-600">Card content</p>
</div>

// Subtle card (on white page background)
<div className="bg-gray-50 rounded-lg border border-gray-100">
  <h3 className="text-gray-900">Card Title</h3>
  <p className="text-gray-600">Card content</p>
</div>

// Dark card (Key Hunt, modals)
<div className="bg-gray-900 rounded-xl">
  <h3 className="text-white">Card Title</h3>
  <p className="text-gray-300">Card content</p>
</div>
```

### Buttons
```tsx
// Primary (blue)
<button className="bg-primary-600 text-white hover:bg-primary-700">
  Primary Action
</button>

// Amber/CTA
<button className="bg-amber-600 text-white hover:bg-amber-700">
  Bonus Action
</button>

// Secondary (outline)
<button className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50">
  Secondary
</button>

// Ghost
<button className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
  Ghost Button
</button>
```

### Form Inputs
```tsx
// Standard input
<input className="bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500" />

// Dark mode input (Key Hunt)
<input className="bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500" />
```

---

## Pre-Commit Checklist

Before finishing any UI work, verify:

1. [ ] **No `text-white` on light backgrounds** (`bg-white`, `bg-gray-50`)
2. [ ] **No `text-gray-*` (dark) on dark backgrounds** (`bg-gray-800`, `bg-gray-900`)
3. [ ] **Buttons have visible text** - colored backgrounds use `text-white`
4. [ ] **Form labels are readable** - use `text-gray-700` on light backgrounds
5. [ ] **Error states are visible** - red text on white: `text-red-700`
6. [ ] **Placeholder text is muted but visible** - `text-gray-400`

---

## Dark Mode Contexts

Key Hunt and some modals use a dark theme. In these contexts:

**Dark Theme Base:**
- Background: `bg-gray-900` or `bg-gray-800`
- Cards: `bg-gray-800` with `border-gray-700`
- Text: `text-white` (headings), `text-gray-300` (body), `text-gray-400` (muted)

**Light Theme Base (default):**
- Background: `bg-white` or `bg-gray-50`
- Cards: `bg-white` with `border-gray-200` or `shadow-sm`
- Text: `text-gray-900` (headings), `text-gray-600` (body), `text-gray-500` (muted)
