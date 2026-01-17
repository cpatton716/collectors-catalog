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
        // Vintage Newsprint - 1940s-50s Golden Age Palette
        vintage: {
          // Paper tones
          paper: "#F5F0E1",
          aged: "#E8D4A8",
          cream: "#FDF8EC",
          // Ink tones
          ink: "#1A1A1A",
          inkSoft: "#2D2D2D",
          inkFaded: "#4A4A4A",
          // Action Comics Bold
          red: "#C41E3A",
          redDark: "#9A1730",
          blue: "#1E4D8C",
          blueDark: "#153A6B",
          yellow: "#F7C942",
          yellowDark: "#D4A830",
          // Aged accents
          brown: "#5C4033",
          rust: "#8B4513",
          foxing: "#C4A77D",
        },
        primary: {
          50: "#FDF8EC",
          100: "#F5F0E1",
          200: "#E8D4A8",
          300: "#F7C942",
          400: "#D4A830",
          500: "#C41E3A",
          600: "#1E4D8C",
          700: "#153A6B",
          800: "#2D2D2D",
          900: "#1A1A1A",
        },
      },
      fontFamily: {
        display: ["var(--font-anton)", "Impact", "sans-serif"],
        serif: ["var(--font-crimson)", "Georgia", "serif"],
        mono: ["var(--font-courier-prime)", "Courier New", "monospace"],
      },
      boxShadow: {
        "vintage": "4px 4px 0px #1A1A1A",
        "vintage-sm": "2px 2px 0px #1A1A1A",
        "vintage-lg": "6px 6px 0px #1A1A1A",
        "vintage-inset": "inset 2px 2px 4px rgba(0,0,0,0.1)",
        "paper": "0 1px 3px rgba(92, 64, 51, 0.12), 0 1px 2px rgba(92, 64, 51, 0.24)",
        "paper-hover": "0 4px 6px rgba(92, 64, 51, 0.15), 0 2px 4px rgba(92, 64, 51, 0.12)",
      },
      backgroundImage: {
        "paper-texture": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
        "halftone": "radial-gradient(circle, #1A1A1A 1px, transparent 1px)",
        "diagonal-lines": "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(26,26,26,0.03) 2px, rgba(26,26,26,0.03) 4px)",
      },
      animation: {
        "stamp": "stamp 0.3s ease-out forwards",
        "typewriter": "typewriter 2s steps(40) forwards",
        "page-turn": "pageTurn 0.6s ease-in-out",
        "ink-spread": "inkSpread 0.4s ease-out forwards",
        "worn-shake": "wornShake 0.5s ease-in-out",
        "fade-in-up": "fadeInUp 0.5s ease-out forwards",
      },
      keyframes: {
        stamp: {
          "0%": { transform: "scale(1.5) rotate(-5deg)", opacity: "0" },
          "50%": { transform: "scale(0.95) rotate(2deg)" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        typewriter: {
          "0%": { width: "0" },
          "100%": { width: "100%" },
        },
        pageTurn: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(-10deg)" },
        },
        inkSpread: {
          "0%": { transform: "scale(0)", opacity: "0.8" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        wornShake: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-1deg)" },
          "75%": { transform: "rotate(1deg)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      borderRadius: {
        "worn": "2px 4px 2px 3px",
      },
    },
  },
  plugins: [],
};

export default config;
