/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: Object.fromEntries([
        ['background', 'background'], ['foreground', 'foreground'],
        ['card', 'card'], ['muted', 'muted'], ['body', 'body'],
        ['muted-foreground', 'muted-foreground'], ['border', 'border'],
        ['accent', 'accent'], ['brand', 'ring'], ['primary', 'primary'],
      ].map(([name, token]) => [name, `hsl(var(--${token}) / <alpha-value>)`])),
    },
  },
  plugins: [],
}
