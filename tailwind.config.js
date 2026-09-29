/**
 * TradelyX Admin tokens — the same palette and type as web.tradelyx.com
 * (tradely-web/src/app/globals.css): Primary Brand green ramp, Cool Gray,
 * Secondary orange for "needs attention", red for errors only.
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Kept for the screens not yet moved onto the tokens below
        primary: "#029150",
        brand: {
          950: "#00301b",
          900: "#009051",
          800: "#1a9b62",
          700: "#33a674",
          600: "#4db185",
          500: "#66bc97",
          300: "#99d3b9",
          200: "#b3ded0",
          100: "#cce9dc",
          50: "#e6f4ee",
        },
        ink: { DEFAULT: "#111827", soft: "#4b5563", faint: "#9ca3af" },
        paper: { DEFAULT: "#f9fafb", deep: "#f4f4f5" },
        rule: "#e5e7eb",
        attention: { DEFAULT: "#ff6600", deep: "#c2410c", soft: "#fff3e0" },
        danger: { DEFAULT: "#e11d48", deep: "#be123c", soft: "#fff1f2" },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(17,24,39,0.04), 0 0 0 1px rgba(17,24,39,0.05)",
        lift: "0 12px 32px -12px rgba(17,24,39,0.18), 0 0 0 1px rgba(17,24,39,0.06)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        "slide-in": { from: { transform: "translateX(100%)" }, to: { transform: "none" } },
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        rise: "rise 260ms cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "slide-in": "slide-in 240ms cubic-bezier(0.2, 0.7, 0.2, 1)",
        fade: "fade 180ms ease-out",
      },
    },
  },
  plugins: [],
};
