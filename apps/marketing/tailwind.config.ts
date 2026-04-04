import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        shield: {
          DEFAULT: '#0F6E56',
          dark: '#0A4D3D',
          light: '#DDF3EC',
        },
      },
    },
  },
  plugins: [],
};

export default config;

