import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#282a36',
        foreground: '#f8f8f2',
        primary: '#bd93f9',
        correct: '#50fa7b',
        present: '#f1fa8c',
        absent: '#44475a',
      }
    },
  },
  plugins: [],
};

export default config;
