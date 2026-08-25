export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#321A0D',
        'primary-light': '#A9791C',
        'primary-dark': '#24130B',
        background: '#F5F0E6',
        surface: '#FFFDFC',
        'surface-muted': '#FAF8F2',
        gold: '#C49A3A',
        'gold-light': '#D8B65D',
        'gold-dark': '#A9791C',
        chocolate: '#321A0D',
        'chocolate-light': '#48240E',
        'chocolate-dark': '#24130B',
        ivory: '#F5F0E6',
        'warm-white': '#FFFDFC',
        'warm-border': '#E4DED3',
        'warm-text': '#2D1B12',
        'warm-muted': '#74675F',
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(50, 26, 13, 0.08)',
        warm: '0 4px 14px rgba(50, 26, 13, 0.10)',
        'warm-lg': '0 10px 30px rgba(50, 26, 13, 0.14)',
      },
    },
  },
  plugins: [],
}
