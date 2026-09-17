/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#071510",
        pine: "#0C1F17",
        moss: "#10241C",
        mint: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
          DEFAULT: "#34D399",
        },
        leaf: "#10B981",
        foam: "#F8FAFC",
        sand: "#FBBF24",
        clay: "#F87171",
        info: "#38BDF8",
      },
      fontFamily: {
        display: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Source Sans 3", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["clamp(2.75rem, 5.4vw, 5rem)", { lineHeight: "1.02", letterSpacing: "-0.035em", fontWeight: "600" }],
        h1: ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "600" }],
        h2: ["1.75rem", { lineHeight: "1.15", letterSpacing: "-0.025em", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.6" }],
        caption: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.04em" }],
      },
      borderRadius: {
        card: "1.25rem",
        control: "0.625rem",
      },
      boxShadow: {
        glow: "0 1px 2px rgba(15, 23, 42, 0.4)",
        card: "0 1px 2px rgba(2, 6, 23, 0.35)",
      },
      backgroundImage: {
        "hero-glow": "none",
      },
    },
  },
  plugins: [],
};
