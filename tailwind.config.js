/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'assistant': ['Assistant', 'Arial', 'sans-serif']
      },
      colors: {
        'royal-blue': '#0A2463',
        'deep-pink': '#D81E5B',
        'light-blue': '#A9D6E5',
        'light-pink': '#FFCAD4',
        'neutral-gray': '#F8F9FA',
        'dark-text': '#212529',
        'medium-text': '#495057',
        'yellow-50': '#FFFBEB',
        'yellow-100': '#FEF3C7',
        'yellow-300': '#FDE68A',
        'yellow-400': '#FACC15',
      },
      animation: {
        'fade-in-down': 'fade-in-down 0.5s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.6s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.6s ease-out forwards',
        'modal-appear': 'modal-appear 0.3s ease-out forwards'
      },
      keyframes: {
        'fade-in-down': {
          'from': { opacity: '0', transform: 'translateY(-20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in-up': {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-in-right': {
          'from': { opacity: '0', transform: 'translateX(-50px)' },
          'to': { opacity: '1', transform: 'translateX(0)' }
        },
        'slide-in-left': {
          'from': { opacity: '0', transform: 'translateX(50px)' },
          'to': { opacity: '1', transform: 'translateX(0)' }
        },
        'modal-appear': {
          'from': { opacity: '0', transform: 'scale(0.95)'},
          'to': {
            opacity: '1',
            transform: 'scale(1)'
          }
        }
      }
    }
  },
  plugins: [],
}
