/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#10b981', // Emerald Green
        secondary: '#92400e', // Earthy Brown
        accent: '#ffffff', // White
      },
    },
  },
  plugins: [],
}