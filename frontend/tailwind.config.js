/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'aeiras-bg': 'var(--bg)',
                'aeiras-surface': 'var(--surface)',
                'aeiras-panel': 'var(--panel)',
                'aeiras-border': 'rgba(255,255,255,0.07)',
                'aeiras-accent': 'var(--cyan)',
                'aeiras-blue': 'var(--blue)',
                'aeiras-red': 'var(--red)',
                'aeiras-orange': 'var(--orange)',
                'aeiras-yellow': 'var(--yellow)',
                'aeiras-green': 'var(--green)',
                'aeiras-purple': 'var(--purple)',
                'aeiras-text': 'var(--text1)',
                'aeiras-text-secondary': 'var(--text2)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                'aeiras': '10px',
                'aeiras-lg': '16px',
                'aeiras-xl': '20px',
            },
            animation: {
                'fade-up': 'fade-up 0.4s ease-out both',
                'fade-in': 'fade-in 0.3s ease-out both',
                'slide-in': 'slide-in-right 0.3s ease-out both',
                'pulse-slow': 'pulse-dot 3s ease-in-out infinite',
                'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
                'float': 'float 3s ease-in-out infinite',
            },
            keyframes: {
                'fade-up': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
                'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
                'slide-in-right': { from: { opacity: '0', transform: 'translateX(16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
                'pulse-dot': { '0%, 100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.5', transform: 'scale(0.85)' } },
                'float': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
            },
        },
    },
    plugins: [],
}
