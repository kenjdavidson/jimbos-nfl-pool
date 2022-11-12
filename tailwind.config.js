/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    '_site/**/*.{html,njk,md}'
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
}
