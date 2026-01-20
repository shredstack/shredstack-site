import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary: Electric Blue - matches logo, energetic tech vibe
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
          950: "#172554",
        },
        // Accent: Vibrant Cyan/Teal - from logo
        accent: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
          950: "#083344",
        },
        // Rainbow accent colors for fun pops of color
        rainbow: {
          pink: "#ec4899",
          purple: "#a855f7",
          indigo: "#6366f1",
          blue: "#3b82f6",
          cyan: "#06b6d4",
          teal: "#14b8a6",
          green: "#22c55e",
          lime: "#84cc16",
          yellow: "#eab308",
          orange: "#f97316",
        },
        // Surface: Slight cool tint to complement blue theme
        surface: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-fira-code)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "gradient-rainbow": "linear-gradient(135deg, #6366f1 0%, #3b82f6 25%, #06b6d4 50%, #14b8a6 75%, #22c55e 100%)",
        "gradient-rainbow-soft": "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(59,130,246,0.1) 25%, rgba(6,182,212,0.1) 50%, rgba(20,184,166,0.1) 75%, rgba(34,197,94,0.1) 100%)",
        "gradient-hero": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      },
      animation: {
        "gradient-x": "gradient-x 15s ease infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
