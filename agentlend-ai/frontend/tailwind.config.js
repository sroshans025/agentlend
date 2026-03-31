/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          blue: '#3B82F6',
          cyan: '#22D3EE',
          purple: '#A855F7',
        },
      },
      boxShadow: {
        glow: '0 0 24px rgba(59,130,246,0.25)',
        card: '0 12px 40px rgba(10, 14, 35, 0.55)',
      },
      backgroundImage: {
        fintech: 'radial-gradient(circle at 20% 0%, rgba(56,189,248,0.22), transparent 32%), radial-gradient(circle at 80% 0%, rgba(168,85,247,0.24), transparent 30%), linear-gradient(180deg, #070B1D 0%, #0A1030 45%, #090F2A 100%)',
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
};
