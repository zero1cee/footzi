/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: '#FDFBF7',
          100: '#FAF8F5',
          200: '#F3EFE6',
          300: '#E7E0D3',
          400: '#D6C9B7',
          500: '#BCAB93',
        },
        charcoal: {
          950: '#0C0C0C',
          900: '#141414',
          800: '#222222',
          700: '#363636',
          600: '#4F4F4F',
          500: '#707070',
          400: '#999999',
          300: '#C4C4C4',
          200: '#E2E2E2',
          100: '#F2F2F2',
        },
        sand: {
          50: '#FAF7F2',
          100: '#F4EEE5',
          200: '#E7D9C6',
          300: '#D9C1A5',
          400: '#C8A27C', // Primary warm accent (tanned leather / warm sandstone)
          500: '#B3895F',
          600: '#966F47',
          700: '#755434',
        },
        terracotta: {
          300: '#E89874',
          400: '#D67C52',
          500: '#BC5D32',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      letterSpacing: {
        widest: '.2em',
        ultra: '.3em',
      },
      borderRadius: {
        'xs': '2px',
        'sm': '4px',
        DEFAULT: '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
      boxShadow: {
        'subtle': '0 2px 10px rgba(0, 0, 0, 0.04)',
        'elevated': '0 12px 30px -10px rgba(20, 20, 20, 0.08)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
