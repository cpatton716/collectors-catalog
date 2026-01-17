import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Keep primary for compatibility
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        // Pop Art / Lichtenstein palette
        pop: {
          // Primary colors - bold and saturated
          red: "#ED1C24",
          redDark: "#C41E3A",
          yellow: "#FFF200",
          yellowDark: "#E6D200",
          blue: "#0066FF",
          blueDark: "#0052CC",
          // Neutrals
          black: "#000000",
          white: "#FFFFFF",
          cream: "#FFF8E7",
          // Secondary accents
          pink: "#FF69B4",
          orange: "#FF6B35",
          green: "#00CC66",
          // Dot pattern base colors
          dotBase: "#FFF8E7",
          dotRed: "rgba(237, 28, 36, 0.3)",
          dotBlue: "rgba(0, 102, 255, 0.3)",
          dotYellow: "rgba(255, 242, 0, 0.3)",
        },
      },
      fontFamily: {
        // Bangers for bold comic headlines
        comic: ["var(--font-bangers)", "Impact", "sans-serif"],
        // Comic Neue for readable body text
        body: ["var(--font-comic-neue)", "Comic Sans MS", "sans-serif"],
        // Mono for accents
        mono: ["var(--font-space-mono)", "monospace"],
      },
      borderWidth: {
        "3": "3px",
        "4": "4px",
        "5": "5px",
        "6": "6px",
      },
      boxShadow: {
        // Bold comic book shadows
        "comic": "4px 4px 0px #000000",
        "comic-sm": "2px 2px 0px #000000",
        "comic-lg": "6px 6px 0px #000000",
        "comic-xl": "8px 8px 0px #000000",
        // Colored shadows for variety
        "comic-red": "4px 4px 0px #ED1C24",
        "comic-blue": "4px 4px 0px #0066FF",
        "comic-yellow": "4px 4px 0px #FFF200",
        // Inner glow for pop effect
        "pop-glow": "inset 0 0 20px rgba(255, 255, 255, 0.5)",
      },
      animation: {
        "pop-in": "popIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "shake": "shake 0.5s ease-in-out",
        "dot-pulse": "dotPulse 2s ease-in-out infinite",
      },
      keyframes: {
        popIn: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" },
        },
        dotPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
