import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        accent: {
          500: "#f59e0b",
          600: "#d97706",
        },
        pink: {
          500: "#ec4899",
        },
        cyan: {
          500: "#06b6d4",
        },
        emerald: {
          500: "#10b981",
        },
        rose: {
          500: "#f43f5e",
        },
        indigo: {
          500: "#6366f1",
        },
        violet: {
          500: "#8b5cf6",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
