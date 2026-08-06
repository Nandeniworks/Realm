/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        realm: {
          navy: {
            DEFAULT: '#080B1A',
            light: '#131835',
            dark: '#040610',
            card: 'rgba(16, 20, 45, 0.4)',
          },
          lavender: {
            DEFAULT: '#C3C9FF',
            muted: '#8A92C6',
            dark: '#4B5282',
          },
          moon: {
            DEFAULT: '#F5F6FA',
            muted: '#A3A6B4',
          },
          cream: '#FFFEE0',
          pink: '#F3C5C1',
          gold: '#EAD08B',
        }
      },
      fontFamily: {
        sans: ['"Outfit"', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
