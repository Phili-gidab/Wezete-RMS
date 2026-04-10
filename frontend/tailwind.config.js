/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#F4C553',   // Mustard Yellow — primary accent
          light: '#F8D97A',
          dark: '#D4A933',
        },
        forest: {
          DEFAULT: '#0A3D39',   // Dark Forest Green — primary text
          light: '#14574F',
        },
      },
    },
  },
  plugins: [],
}
