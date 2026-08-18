/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        abh: {
          navy:   '#1B2A4A',
          red:    '#C0392B',
          amber:  '#E67E22',
          green:  '#27AE60',
          blue:   '#0E7CCE',
          ltgrey: '#F5F5F5',
          mdgrey: '#CCCCCC',
          dktext: '#333333',
        }
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif']
      }
    }
  },
  plugins: []
}
