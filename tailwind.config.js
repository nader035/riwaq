/** @type {import('tailwindcss').Config} */
module.exports = {
  // تفعيل الوضع الداكن بناءً على الكلاس
  darkMode: ['class'],
  // تحديد مسارات ملفات أنجولار
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // ألوان رِواق الأساسية (Sanctuary Theme)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        border: 'hsl(var(--border))',
        // ألوان مباشرة للاستخدام السريع
        sanctuary: {
          dark: '#191F21',
          turquoise: '#62D7DD',
          surface: '#232A2D',
        },
      },
      fontFamily: {
        // دمج الخط الإنجليزي والعربي (Myriad)
        sans: ['"Myriad Pro"', '"Myriad Arabic"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(98, 215, 221, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(98, 215, 221, 0.5)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
