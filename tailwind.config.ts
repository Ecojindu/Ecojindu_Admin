import type { Config } from "tailwindcss";

/**
 * Same brand palette as the customer site, tuned for a dense operations UI:
 * a dark forest sidebar against a light content area, greens as accents only.
 * `slate` carries the neutral chrome so data tables stay quiet and legible.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", lg: "1.5rem" },
      screens: { "2xl": "1600px" },
    },
    extend: {
      colors: {
        cream: { DEFAULT: "#EAE8DB", 50: "#FAFAF6", 100: "#F5F4EC", 200: "#EAE8DB", 300: "#E2E0D2", 400: "#D4D1BF" },
        leaf: { DEFAULT: "#7CB342", light: "#9CCB6A", dark: "#68A032" },
        moss: { DEFAULT: "#4C8C2B", light: "#5FA338", dark: "#3D7222" },
        forest: { DEFAULT: "#2F5233", light: "#3F6B44", dark: "#1E3521", deep: "#16281A" },
        teal: { DEFAULT: "#2BAE8E", light: "#4FC7A9", dark: "#1F7A63" },
        ink: { DEFAULT: "#15181A", muted: "#4A5450", soft: "#8A918D" },
        clay: { DEFAULT: "#C4562F", light: "#FBF3EE", dark: "#9E3F1E" },
        amber: { DEFAULT: "#D99A20", light: "#FBF5E6", dark: "#8A6414" },

        // Neutral chrome for tables and panels.
        surface: { DEFAULT: "#FFFFFF", muted: "#F7F8F6", sunken: "#F1F3F0" },
        line: { DEFAULT: "#E6E8E4", strong: "#D3D7D1" },

        border: "#E6E8E4",
        input: "#E6E8E4",
        ring: "#4C8C2B",
        background: "#F7F8F6",
        foreground: "#15181A",
        primary: { DEFAULT: "#4C8C2B", foreground: "#FFFFFF" },
        destructive: { DEFAULT: "#C4562F", foreground: "#FFFFFF" },
        muted: { DEFAULT: "#F1F3F0", foreground: "#8A918D" },
      },
      borderRadius: { lg: "0.875rem", md: "0.625rem", sm: "0.375rem", xl: "1.125rem", "2xl": "1.375rem" },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      fontSize: {
        "display-sm": ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "display-md": ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.025em" }],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(21,24,26,0.04), 0 2px 8px rgba(21,24,26,0.04)",
        lift: "0 2px 4px rgba(21,24,26,0.05), 0 12px 28px rgba(21,24,26,0.09)",
        panel: "0 1px 3px rgba(21,24,26,0.06)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(76,140,43,0.45)" },
          "70%": { boxShadow: "0 0 0 14px rgba(76,140,43,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(76,140,43,0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.28s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 1.6s infinite",
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
