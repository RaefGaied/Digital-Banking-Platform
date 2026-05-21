/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#fff4ed",
          100: "#ffe8d5",
          200: "#ffd0aa",
          300: "#ffb074",
          400: "#ff843c",
          500: "#e8611a",
          600: "#d4500f",
          700: "#b03d0b",
          800: "#8c3110",
          900: "#712a11",
        },
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
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
