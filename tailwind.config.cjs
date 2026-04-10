/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4a5d4e',
          light: '#f0f4f0',
        },
        accent: {
          DEFAULT: '#d2b48c',
          light: '#fdfaf5',
        },
        'elos-verde': '#4a5d4e',
        'elos-bege': '#d2b48c',
        'elos-fundo': '#fdfaf5',
        'elos-texto': '#333d35',
      },
      fontFamily: {
        tradicional: ['Georgia', 'serif'],
        moderna: ['Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}