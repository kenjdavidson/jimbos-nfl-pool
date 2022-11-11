/** @type {import('tailwindcss').Config} */
module.exports = {
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
