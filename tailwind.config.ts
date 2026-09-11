import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.1)",
        lift: "0 4px 6px -2px rgba(16,24,40,.06), 0 12px 24px -6px rgba(16,24,40,.12)",
        brand: "0 4px 14px -2px rgba(16,185,129,.45)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { transform: "scale(.6)", opacity: "0" },
          "70%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translate(-50%, 12px)" },
          "100%": { opacity: "1", transform: "translate(-50%, 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".55" },
        },
      },
      animation: {
        "fade-up": "fade-up .45s cubic-bezier(.21,.6,.35,1) both",
        "pop-in": "pop-in .35s cubic-bezier(.21,.6,.35,1) both",
        "toast-in": "toast-in .3s cubic-bezier(.21,.6,.35,1) both",
        shimmer: "shimmer 1.4s linear infinite",
        float: "float 5s ease-in-out infinite",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(.21,.6,.35,1)",
      },
    },
  },
  plugins: [],
};

export default config;
