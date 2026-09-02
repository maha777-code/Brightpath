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
        sans: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
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
