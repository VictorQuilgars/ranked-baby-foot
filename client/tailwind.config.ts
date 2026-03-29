import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Fond (style COD dark)
        night: {
          DEFAULT: '#07080d',
          2: '#0d0f1a',
          3: '#131727',
        },
        // Accents UI
        accent: '#e94560',
        'gold-ui': '#f5a623',
        // Rangs
        rank: {
          bronze: '#cd7f32',
          silver: '#c0c0c0',
          gold: '#ffd700',
          platinum: '#00b4d8',
          diamond: '#7b2fff',
          crimson: '#dc143c',
          iridescent: '#ff00ff', // fallback — gradient en prod
        },
        // Texte
        muted: '#a8a8b3',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
      },
      backgroundImage: {
        'rank-iridescent': 'linear-gradient(135deg, #ff0080, #ff8c00, #ffe100, #00ff80, #00cfff, #7b2fff)',
      },
      boxShadow: {
        'glow-gold': '0 0 20px rgba(245, 166, 35, 0.6)',
        'glow-crimson': '0 0 20px rgba(220, 20, 60, 0.6)',
        'glow-diamond': '0 0 20px rgba(123, 47, 255, 0.6)',
        'glow-iridescent': '0 0 30px rgba(255, 0, 255, 0.5)',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'rank-shine': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'rank-shine': 'rank-shine 3s ease infinite',
      },
    },
  },
  plugins: [],
};

export default config;
