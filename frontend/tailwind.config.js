/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
      },
      spacing: {
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '68': '17rem',
        '72': '18rem',
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      animation: {
        "fade-in":    "fadeIn .15s ease-out both",
        "slide-up":   "slideUp .2s ease-out both",
        "slide-in":   "slideIn .2s ease-out both",
        "scale-in":   "scaleIn .15s ease-out both",
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 },                                 to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(6px)" },   to: { opacity: 1, transform: "translateY(0)" } },
        slideIn: { from: { opacity: 0, transform: "translateX(-6px)" },  to: { opacity: 1, transform: "translateX(0)" } },
        scaleIn: { from: { opacity: 0, transform: "scale(.97)" },        to: { opacity: 1, transform: "scale(1)" } },
      },
      boxShadow: {
        'sm':    '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'card':  '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'md':    '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'lg':    '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
        'modal': '0 20px 40px -8px rgb(0 0 0 / 0.18), 0 8px 16px -4px rgb(0 0 0 / 0.08)',
        'inner': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
};
