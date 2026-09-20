/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#e8611a",
          600: "#d4500f",
          700: "#b03d0b",
          800: "#8c3110",
          900: "#712a11",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          2: "rgb(var(--surface-2) / <alpha-value>)",
        },
        canvas: "rgb(var(--bg) / <alpha-value>)",
        cream: {
          50:  "rgb(var(--cream-50) / <alpha-value>)",
          100: "rgb(var(--cream-100) / <alpha-value>)",
          200: "rgb(var(--cream-200) / <alpha-value>)",
        },
        dark: {
          800: "rgb(var(--dark-800) / <alpha-value>)",
          700: "rgb(var(--dark-700) / <alpha-value>)",
          600: "rgb(var(--dark-600) / <alpha-value>)",
        }
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        'glow': '0 0 25px -5px rgba(232, 97, 26, 0.25)',
        'glow-lg': '0 0 35px -5px rgba(232, 97, 26, 0.35)',
      }
    },
  },
  plugins: [],
}
