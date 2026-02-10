import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LangService {
  currentLang = signal<'en' | 'ar'>('en');

  toggleLang() {
    this.currentLang.update((l) => (l === 'en' ? 'ar' : 'en'));
    document.dir = this.currentLang() === 'ar' ? 'rtl' : 'ltr';
  }
}
