/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#4318FF',
        success: '#05CD99',
        error: '#FF0000',
        dark: {
          bg: '#0B0F19',
          card: '#1B2131',
          hover: '#252B3B'
        }
      },
      fontFamily: {
        sans: ['Satoshi', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'xs': ['14px', { lineHeight: '20px' }],
        'sm': ['16px', { lineHeight: '24px' }],
        'base': ['18px', { lineHeight: '28px' }],
        'lg': ['20px', { lineHeight: '30px' }],
        'xl': ['24px', { lineHeight: '32px' }],
        '2xl': ['28px', { lineHeight: '36px' }],
        '3xl': ['32px', { lineHeight: '40px' }],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
} 