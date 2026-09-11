/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    // Keep existing Brightpath CSS (landing + tutor) intact
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cambria', 'Georgia', 'serif'],
        serif: ['Cambria', 'Georgia', 'serif'],
        heading: ['Cambria', 'Georgia', 'serif'],
        pickwick: ['Cambria', 'Georgia', 'serif'],
      },
      fontSize: {
        xs: ['0.875rem', { lineHeight: '1.25rem' }],
        sm: ['1rem', { lineHeight: '1.5rem' }],
        base: ['1.125rem', { lineHeight: '1.75rem' }],
        lg: ['1.25rem', { lineHeight: '1.75rem' }],
        xl: ['1.375rem', { lineHeight: '2rem' }],
      },
      colors: {
        teal: {
          700: '#0f766e',
          600: '#0d9488',
        },
      },
      boxShadow: {
        soft: '0 8px 30px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
};
