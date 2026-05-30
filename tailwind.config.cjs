/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: '#0d1014',
        cellar: '#1a0710',
        garnet: '#7b1836',
        brass: '#d6a94f',
        ivory: '#f7f0df',
      },
      boxShadow: {
        cellar: '0 24px 70px rgba(0, 0, 0, 0.28)',
        glow: '0 18px 60px rgba(123, 24, 54, 0.22)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 360ms ease-out both',
      },
    },
  },
  plugins: [],
}
