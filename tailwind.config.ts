import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        talavera: {
          blue: '#0a0b40',
          cream: '#e7e4e2',
          shadow: '#d0cdcb',
        },
        aws: {
          orange: '#fe9801',
          text: '#243040',
        },
        dark: {
          bg: '#0f0f1e',
          surface: '#1a1b2e',
          border: '#2a2b3e',
        },
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
        }
      },
      fontFamily: {
        amazon: ['Amazon Ember', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        talavera: '0 4px 6px -1px var(--color-shadow), 0 2px 4px -1px var(--color-shadow)',
        'talavera-lg': '0 10px 15px -3px var(--color-shadow), 0 4px 6px -2px var(--color-shadow)',
      },
      animation: {
        'talavera-float': 'talavera-float 6s ease-in-out infinite',
        'talavera-pulse': 'talavera-pulse 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
      },
      keyframes: {
        'talavera-float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(2deg)' },
        },
        'talavera-pulse': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.05)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      screens: {
        xs: '475px',
      },
    },
  },
  plugins: [],
} satisfies Config;
