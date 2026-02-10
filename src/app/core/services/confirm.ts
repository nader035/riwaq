import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  isOpen = signal(false);
  message = signal('Are you sure you want to proceed?');

  // سنخزن هنا الدالة التي ستنفذ عند الضغط على "نعم"
  private resolveFn: (value: boolean) => void = () => {};

  ask(message: string): Promise<boolean> {
    this.message.set(message);
    this.isOpen.set(true);

    return new Promise((resolve) => {
      this.resolveFn = resolve;
    });
  }

  confirm() {
    this.isOpen.set(false);
    this.resolveFn(true);
  }

  cancel() {
    this.isOpen.set(false);
    this.resolveFn(false);
  }
}
