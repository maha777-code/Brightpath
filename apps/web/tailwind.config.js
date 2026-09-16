/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'ui-monospace', 'monospace'],
        serif: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'ui-monospace', 'monospace'],
        mono: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'ui-monospace', 'monospace'],
        heading: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'ui-monospace', 'monospace'],
        pickwick: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.15rem' }],
        sm: ['0.875rem', { lineHeight: '1.35rem' }],
        base: ['1rem', { lineHeight: '1.6rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.85rem' }],
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
    },
  },
  plugins: [],
};
