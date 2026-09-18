/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"SF Pro"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
        serif: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
        heading: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
        pickwick: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      letterSpacing: {
        tightest: '-0.025em',
        tight: '-0.015em',
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.15rem' }],
        sm: ['0.875rem', { lineHeight: '1.35rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.65rem' }],
        xl: ['1.25rem', { lineHeight: '1.7rem' }],
      },
      colors: {
        cyber: {
          primary: '#030712',
          secondary: '#0b0f19',
          card: '#0f172a',
          cyan: '#06b6d4',
          emerald: '#10b981',
          neon: '#22d3ee',
          alert: '#f43f5e',
          border: '#1e293b',
          glow: '#0891b2',
          code: '#00f0ff',
        },
        teal: {
          700: '#0f766e',
          600: '#0d9488',
        },
      },
      boxShadow: {
        soft: '0 8px 30px rgba(15, 23, 42, 0.06)',
        cyber: '0 0 20px rgba(6, 182, 212, 0.3)',
        'cyber-sm': '0 0 15px rgba(6, 182, 212, 0.15)',
      },
      keyframes: {
        'scroll-left-to-right': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
      },
      animation: {
        'marquee-reverse': 'scroll-left-to-right 35s linear infinite',
      },
    },
  },
  plugins: [],
};
