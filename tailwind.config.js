/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.{html,js}',
    './src/**/*.{html,js}',
    './public/**/*.{html,js}',
    './*.html'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Prompt', 'sans-serif']
      },
      animation: {
        floatUp: 'floatUp 0.5s ease-out'
      }
    }
  },
  plugins: [
    require('daisyui')
  ],
  daisyui: {
    themes: ['light', 'dark', 'corporate']
  }
};