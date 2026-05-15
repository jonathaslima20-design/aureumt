/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#FF3B00',
        surface: '#0F0F0F',
        background: '#050505',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 15s linear infinite',
        'reverse-spin': 'spin 20s linear infinite reverse',
        marquee: 'marquee 30s linear infinite',
        scan: 'scan 3s linear infinite',
        blink: 'blink 2s ease-in-out infinite',
        'pulse-fast': 'pulse 1s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-33.333%)' },
        },
        scan: {
          '0%': { top: '-20%' },
          '100%': { top: '120%' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
    },
  },
  plugins: [],
};
