import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // true تعني الوضع الداكن (الافتراضي في رِواق)
  isDarkMode = signal(true);

  toggleTheme() {
    this.isDarkMode.update((v) => !v);

    // إضافة أو حذف كلاس 'light-theme' من الـ body
    // لو isDarkMode = false، سيتم إضافة الكلاس
    document.body.classList.toggle('light-theme', !this.isDarkMode());
  }
}
