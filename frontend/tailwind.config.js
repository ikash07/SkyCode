/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Neo-Brutalism core palette */
        'neo-bg':      '#FFFDF5',
        'neo-black':   '#000000',
        'neo-white':   '#FFFFFF',
        'neo-accent':  '#FF6B6B',   /* Hot Red */
        'neo-yellow':  '#FFD93D',   /* Vivid Yellow */
        'neo-muted':   '#C4B5FD',   /* Soft Violet */
        /* Semantic aliases (CSS-var backed) */
        canvas:      'var(--color-canvas)',
        panel:       'var(--color-panel)',
        surface:     'var(--color-surface)',
        border:      'var(--color-border)',
        'color-text': 'var(--color-text)',
        muted:       'var(--color-muted)',
        accent:      'var(--color-accent)',
        accentSoft:  'var(--color-accent-soft)',
        danger:      'var(--color-danger)',
        success:     'var(--color-success)',
      },
      boxShadow: {
        /* Hard offset shadows — zero blur, zero spread */
        'neo-sm':   '4px 4px 0px 0px #000000',
        'neo':      '6px 6px 0px 0px #000000',
        'neo-md':   '8px 8px 0px 0px #000000',
        'neo-lg':   '12px 12px 0px 0px #000000',
        'neo-xl':   '16px 16px 0px 0px #000000',
        /* Dark-mode white variants */
        'neo-sm-w': '4px 4px 0px 0px #FFFDF5',
        'neo-w':    '6px 6px 0px 0px #FFFDF5',
        'neo-md-w': '8px 8px 0px 0px #FFFDF5',
        'neo-lg-w': '12px 12px 0px 0px #FFFDF5',
        /* Press state (after translate covers shadow) */
        'neo-press': '2px 2px 0px 0px #000000',
        'neo-press-w': '2px 2px 0px 0px #FFFDF5',
      },
      fontFamily: {
        sans:  ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:  ['Space Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        display: ['clamp(3rem,8vw,7rem)', { lineHeight: '0.9', letterSpacing: '-0.03em' }],
      },
      borderWidth: {
        3: '3px',
        5: '5px',
      },
      animation: {
        'spin-slow':  'spin 10s linear infinite',
        'bounce-sm':  'bounce 1.2s ease infinite',
        'nb-in':      'nb-slide-in 0.22s ease-out both',
      },
      keyframes: {
        'nb-slide-in': {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
