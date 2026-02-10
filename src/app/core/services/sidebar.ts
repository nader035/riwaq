import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  // مفتوح افتراضياً
  isOpen = signal(true);

  open() {
    this.isOpen.set(true);
  }
  close() {
    this.isOpen.set(false);
  }
  toggle() {
    this.isOpen.update((v) => !v);
  }
}
