import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="'relative overflow-hidden animate-pulse bg-white/5 rounded-2xl ' + customClass"
      [style.width]="width"
      [style.height]="height"
    >
      <div
        class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer"
      ></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block; /* يحل مشكلة الالتصاق */
        width: 100%; /* يضمن أن السكيلتون يأخذ عرض الحاوية الأب */
      }

      @keyframes shimmer {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }

      .animate-shimmer {
        animation: shimmer 2.5s infinite;
      }
    `,
  ],
})
export class SkeletonComponent {
  @Input() width: string = '100%';
  @Input() height: string = '20px';
  @Input() customClass: string = '';
}
