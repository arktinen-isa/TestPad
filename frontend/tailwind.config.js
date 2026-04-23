/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#1a0a4e',
        'purple-accent': '#7c3aed',
        'pink-accent': '#ec4899',
        'green-cta': '#00ff87',
      },
      fontFamily: {
        unbounded: ['Unbounded', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
