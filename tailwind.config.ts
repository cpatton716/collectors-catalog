import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Custom Retro-Futuristic Color Palette
      colors: {
        // Core brand colors
        cc: {
          ink: "#0a0f1a",        // Deep black with blue undertone
          cream: "#faf6f1",      // Warm off-white (newsprint)
          scanner: "#00d4ff",    // Electric cyan (AI/tech)
          gold: "#f59e0b",       // Rich amber (value/premium)
          red: "#dc2626",        // Classic comic red
          mint: "#34d399",       // Retro mint (success/profit)
          purple: "#8b5cf6",     // Silver Age purple (graded)
        },
        // Keep primary for backwards compatibility, but with scanner blue influence
        primary: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#00d4ff",
          600: "#00b8db",
          700: "#0891b2",
          800: "#0e7490",
          900: "#164e63",
        },
      },
      // Custom fonts
      fontFamily: {
        display: ["var(--font-bebas-neue)", "Impact", "sans-serif"],
        sans: ["var(--font-source-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      // Custom animations
      animation: {
        "scanner-sweep": "scanner-sweep 2s ease-in-out infinite",
        "value-shimmer": "value-shimmer 2s ease-in-out infinite",
        "card-lift": "card-lift 0.3s ease-out forwards",
        "stagger-in": "stagger-in 0.5s ease-out forwards",
        "typewriter": "typewriter 0.5s steps(20) forwards",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
      keyframes: {
        "scanner-sweep": {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateY(100%)", opacity: "0" },
        },
        "value-shimmer": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "card-lift": {
          "0%": { transform: "translateY(0) rotate(0deg)", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" },
          "100%": { transform: "translateY(-8px) rotate(1deg)", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
        },
        "stagger-in": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "typewriter": {
          "0%": { width: "0" },
          "100%": { width: "100%" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0, 212, 255, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(0, 212, 255, 0.6)" },
        },
      },
      // Custom shadows
      boxShadow: {
        "retro": "4px 4px 0px rgba(10, 15, 26, 0.8)",
        "retro-sm": "2px 2px 0px rgba(10, 15, 26, 0.8)",
        "scanner": "0 0 30px rgba(0, 212, 255, 0.4)",
        "gold": "0 0 20px rgba(245, 158, 11, 0.4)",
        "card-hover": "0 20px 40px rgba(10, 15, 26, 0.15)",
      },
      // Background patterns
      backgroundImage: {
        "halftone": "radial-gradient(circle, rgba(10, 15, 26, 0.08) 1px, transparent 1px)",
        "halftone-dark": "radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
        "scanner-gradient": "linear-gradient(135deg, #0a0f1a 0%, #1a2744 100%)",
        "gold-shimmer": "linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)",
      },
      backgroundSize: {
        "halftone": "8px 8px",
      },
    },
  },
  plugins: [],
};

export default config;
