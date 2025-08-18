/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          main: '#FFFFFF',
          sub: '#F7F7F5'
        },
        text: {
          main: '#37352F',
          sub: '#787774',
          help: '#B3B1AC'
        },
        accent: {
          primary: '#2383E2',
          success: '#529C6F',
          error: '#E85646',
          warning: '#F5A623'
        },
        border: '#E9E9E7'
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'sans-serif']
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0,0,0,0.08)'
      }
    },
  },
  plugins: [],
}