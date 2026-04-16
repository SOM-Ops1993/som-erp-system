/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1a1a2e', light: '#16213e', dark: '#0f0f1a' },
        accent:  { DEFAULT: '#e94560', light: '#ff6b6b' },
        success: '#00b894',
        warning: '#fdcb6e',
        danger:  '#e17055',
      },
    },
  },
  plugins: [],
}
