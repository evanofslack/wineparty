import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F3EE',
        coral: '#FF6B6B',
        sky: '#4ECDC4',
        lime: '#95E06C',
        sunny: '#FFE66D',
        grape: '#2563EB',
        ink: '#2C1A1D',
        muted: '#8B7D7F',
      },
      fontFamily: {
        // Playful rounded font — loaded via Google Fonts in index.html
        display: ['"Nunito"', 'system-ui', 'sans-serif'],
        body: ['"Nunito"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sketch: '12px 8px 14px 10px / 8px 14px 10px 12px',
      },
      boxShadow: {
        sketch: '4px 4px 0px 0px rgba(44,26,29,0.15)',
        'sketch-lg': '6px 6px 0px 0px rgba(44,26,29,0.2)',
      },
    },
  },
  plugins: [],
} satisfies Config
