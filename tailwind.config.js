/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: {
          DEFAULT: '#4318FF',
          dark: '#6B4EFF',
          light: '#A18BFF',
          50: '#F3F1FF',
          100: '#E9E5FF',
          200: '#D4CCFF',
          300: '#B8A8FF',
          400: '#9C85FF',
          500: '#7D5FFF',
          600: '#6B4EFF',
          700: '#5B40E3',
          800: '#4B34C6',
          900: '#3A2798'
        },
        // Status colors
        success: {
          DEFAULT: '#05CD99',
          dark: '#039D74',
          light: '#E0FFF7',
        },
        error: {
          DEFAULT: '#FF3B3B',
          dark: '#D60000',
          light: '#FFE5E5',
        },
        warning: {
          DEFAULT: '#FFB547',
          dark: '#E08700',
          light: '#FFF5E0',
        },
        info: {
          DEFAULT: '#3965FF',
          dark: '#0039D7',
          light: '#E5ECFF',
        },
        // Semantic UI colors - Flattened structure for easier use with Tailwind
        theme: {
          // Light mode background colors
          background: '#F5F7FA',
          'background-card': '#FFFFFF',
          'background-input': '#FFFFFF',
          'background-hover': '#F0F3F9',
          'background-active': '#E5EAF2',
          'background-border': '#E2E8F0',
          
          // Light mode text colors
          text: '#1E293B',
          'text-secondary': '#64748B',
          'text-tertiary': '#94A3B8',
          'text-disabled': '#CBD5E1',
          'text-inverse': '#FFFFFF',
          
          // Dark mode background colors - True black for OLED
          'dark-background': '#000000',
          'dark-background-card': '#0A0E17',
          'dark-background-input': '#0F1623',
          'dark-background-hover': '#0F1623',
          'dark-background-active': '#1E293B',
          'dark-background-border': '#1E293B',
          
          // Dark mode text colors
          'dark-text': '#F8FAFC',
          'dark-text-secondary': '#CBD5E1',
          'dark-text-tertiary': '#94A3B8',
          'dark-text-disabled': '#64748B',
          'dark-text-inverse': '#0F172A',
        },
        // Legacy colors (for backward compatibility)
        dark: {
          bg: '#000000',     // Updated to pure black for OLED
          card: '#0A0E17',   // Updated to near-black for OLED
          hover: '#0F1623',  // Updated to near-black for OLED
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
      spacing: {
        '18': '4.5rem', // 72px
        '22': '5.5rem', // 88px - useful for header spacing
      },
    },
  },
  plugins: [],
} 