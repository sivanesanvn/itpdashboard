/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e6f1fb',
          100: '#b5d4f4',
          500: '#185FA5',
          700: '#0C447C',
          900: '#042C53',
        },
      },
    },
  },
  plugins: [],
}
