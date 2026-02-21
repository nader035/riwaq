import { Injectable, signal, effect } from '@angular/core';

// الأوضاع الثلاثة المتاحة في "رُواق"
export type ThemeMode = 'deep' | 'dim' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // 1. السيجنال اللي شايلة الوضع الحالي (بتقرأ من التخزين المحلي أو بتبدأ بـ Deep)
  mode = signal<ThemeMode>((localStorage.getItem('riwaq_theme') as ThemeMode) || 'deep');

  constructor() {
    // 2. الـ Effect بيراقب أي تغيير في الـ mode وينفذ التعديل فوراً
    effect(() => {
      const theme = this.mode();
      const body = document.body;

      // تنظيف الكلاسات القديمة عشان م يحصلش تداخل في الألوان
      body.classList.remove('dim-theme', 'light-theme');

      // تطبيق الكلاس الجديد (Deep هو الأساس في الـ CSS بدون كلاس)
      if (theme === 'dim') body.classList.add('dim-theme');
      if (theme === 'light') body.classList.add('light-theme');

      // حفظ الاختيار عشان لو المستخدم عمل Refresh يفضل على ذوقه
      localStorage.setItem('riwaq_theme', theme);
    });
  }

  // 3. دالة بسيطة لتغيير الثيم من أي مكان (Sidebar أو Header)
  setTheme(newMode: ThemeMode) {
    this.mode.set(newMode);
  }
}