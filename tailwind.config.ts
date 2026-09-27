import type { Config } from "tailwindcss";

// DIFF Design System
// Color -- Deep Black canvas with four neon accents, used sparingly on
// interactive/important elements only (buttons, active states, glow).
// Type -- Space Grotesk for all UI text; Press Start 2P reserved for the
// DIFF wordmark, scores and level numbers only (never body copy).
// Shape -- a notched-corner "cabinet" motif (clipped corner) stands in for
// generic rounded-corner SaaS cards; used consistently across cards/panels.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        black: {
          DEFAULT: "#0A0A0F",
          soft: "#111018",
        },
        surface: {
          DEFAULT: "#151220",
          raised: "#1C1830",
          border: "#2A2440",
        },
        neon: {
          magenta: "#FF2E9A",
          purple: "#9D4EDD",
          blue: "#3D5AFE",
          cyan: "#00F0FF",
        },
        muted: "#8B85A3",
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        display: ["var(--font-press-start)", "monospace"],
      },
      boxShadow: {
        "glow-magenta": "0 0 12px rgba(255,46,154,0.55), 0 0 32px rgba(255,46,154,0.25)",
        "glow-cyan": "0 0 12px rgba(0,240,255,0.55), 0 0 32px rgba(0,240,255,0.25)",
        "glow-purple": "0 0 12px rgba(157,78,221,0.55), 0 0 32px rgba(157,78,221,0.25)",
        "glow-soft": "0 8px 30px rgba(0,0,0,0.45)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(180deg, rgba(10,10,15,0) 0%, #0A0A0F 85%), radial-gradient(60% 50% at 50% 0%, rgba(157,78,221,0.18) 0%, rgba(10,10,15,0) 60%)",
        scanlines:
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 3px)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2.2s ease-in-out infinite",
        "rise-in": "rise-in 0.4s ease-out both",
      },
    },
  },
  plugins: [
    function ({ addUtilities }: any) {
      addUtilities({
        ".clip-notch": {
          clipPath:
            "polygon(0 14px, 14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)",
        },
        ".clip-notch-sm": {
          clipPath:
            "polygon(0 8px, 8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
        },
      });
    },
  ],
};
export default config;
