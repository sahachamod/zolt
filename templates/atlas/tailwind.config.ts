import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./app/**/*.{ts,tsx}", "./resources/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: { 50: "#eef2ff", 500: "#6366f1", 600: "#4f46e5", 950: "#1e1b4b" } },
      animation: { "fade-in": "fade-in 300ms ease-out" },
      keyframes: { "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } } }
    }
  },
  plugins: [forms, typography]
} satisfies Config;
