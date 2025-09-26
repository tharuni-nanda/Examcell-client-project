/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Ensures all source files are scanned
  ],
  theme: {
    extend: {
      fontFamily: {
        times: ['Times New Roman', 'serif'],
        inter: ['Inter', 'sans-serif'],
        fredoka: ['Fredoka', 'cursive'], // ✅ Added for Dashboard
      },
      colors: {
        primary: 'hsl(var(--primary))',
        secondary: 'hsl(var(--secondary))',
        text: 'hsl(var(--foreground))',
        background: 'hsl(var(--background))',

        // Optional specific tokens
        'primary-50': 'hsl(var(--primary-50))',
        'primary-100': 'hsl(var(--primary-100))',
        'primary-600': 'hsl(var(--primary-600))',
        'primary-700': 'hsl(var(--primary-700))',

        green: {
          600: 'hsl(var(--healthcare-green))',
        },
        purple: {
          600: 'hsl(var(--healthcare-purple))',
        },
        amber: {
          600: 'hsl(var(--healthcare-amber))',
        },
      },
      backgroundImage: {
        gradient: 'var(--gradient)',
      },
      animation: {
        slideUp: 'slideUp 0.5s ease-out',
        float: 'float 3s ease-in-out infinite',
        fadeIn: 'fadeIn 0.6s ease forwards',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide'),
  ],
};
