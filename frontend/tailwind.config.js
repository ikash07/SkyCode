/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        panel: 'var(--color-panel)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
        muted: 'var(--color-muted)',
        accent: 'var(--color-accent)',
        accentSoft: 'var(--color-accent-soft)',
        danger: 'var(--color-danger)',
        success: 'var(--color-success)'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(96,165,250,.15), 0 18px 60px rgba(0,0,0,.35)'
      }
    }
  },
  plugins: []
};
