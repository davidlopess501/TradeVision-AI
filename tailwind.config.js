/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#05070d',
          900: '#0a0e17',
          850: '#0e1320',
          800: '#131a2b',
          750: '#1a2236',
          700: '#232d44',
          600: '#33415c',
          500: '#4a5774',
        },
        bull: { 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669' },
        bear: { 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626' },
        wait: { 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b' },
        accent: { 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7' },
        gold: { 400: '#fbbf24', 500: '#f59e0b' },
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '70%': { transform: 'scale(1.7)', opacity: '0' },
          '100%': { transform: 'scale(1.7)', opacity: '0' },
        },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'bar-grow': { '0%': { transform: 'scaleX(0)' }, '100%': { transform: 'scaleX(1)' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'count-blink': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.35' } },
      },
      animation: {
        'fade-up': 'fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.4s ease both',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'bar-grow': 'bar-grow 0.8s cubic-bezier(0.22,1,0.36,1) both',
        'spin-slow': 'spin-slow 1s linear infinite',
        'count-blink': 'count-blink 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
