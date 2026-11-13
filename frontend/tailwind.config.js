/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm candlelight palette — deep maroon, temple gold, cream ground.
        maroon: {
          50: '#fdf5f3',
          100: '#fbe8e4',
          200: '#f6cec6',
          300: '#eda99b',
          400: '#df7862',
          500: '#cd5540',
          600: '#b03c2c',
          700: '#8f2f24',
          800: '#6d2620',
          900: '#4a1a17',
          950: '#2b0d0b',
        },
        gold: {
          50: '#fdfaef',
          100: '#faf2d3',
          200: '#f4e3a3',
          300: '#eccd6a',
          400: '#e3b53f',
          500: '#d59c25',
          600: '#b8791c',
          700: '#93591a',
          800: '#79471d',
          900: '#663b1c',
        },
        cream: {
          50: '#fffdf8',
          100: '#fdf8ee',
          200: '#f9efdc',
          300: '#f2e2c4',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(74,26,23,0.04), 0 8px 24px -12px rgba(74,26,23,0.18)',
        lift: '0 2px 4px rgba(74,26,23,0.06), 0 16px 40px -16px rgba(74,26,23,0.28)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'slide-up': 'slide-up 0.28s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
};
