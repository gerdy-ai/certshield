import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        shield: {
          DEFAULT: '#0F6E56',
          dark: '#0A4D3D',
          light: '#DDF3EC',
        },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '20px',
      },
    },
  },
  plugins: [],
};

export default config;

