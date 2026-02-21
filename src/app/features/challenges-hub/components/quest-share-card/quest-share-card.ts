/* - Riwaq Share Studio Engine (Sidebar-Aware Version) */
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  signal,
  inject,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { domToBlob } from 'modern-screenshot';
import { SidebarService } from '../../../../core/services/sidebar';

@Component({
  selector: 'app-quest-share-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quest-share-card.html',
  styleUrl: './quest-share-card.css',
})
export class QuestShareCard {
  // المدخلات الأساسية من المكون الأب
  @Input() dayNumber: number = 0;
  @Input() goal: string = '';
  @Input() focusTime: string = '';
  @Output() close = new EventEmitter<void>();
  totalDays = input(0);
  // الوصول للعنصر الذي سيتم تصويره
  @ViewChild('shareContent') shareContent!: ElementRef;

  // حقن خدمة السايد بار للتحكم في مركزية المودال
  public sidebarService = inject(SidebarService);

  // إعدادات الكارت (حالة المقاس والتايمر)
  currentFormat = signal<'story' | 'post'>('story');
  showTimer = signal<boolean>(true);

  /**
   * حساب الإزاحة المطلوبة لتوسط الشاشة بعيداً عن السايد بار
   * العرض المستخدم للسايد بار في الميديا كويري md هو 288 بكسل (w-72)
   */
  marginLeft = computed(() => {
    return this.sidebarService.isOpen() ? '288px' : '0px';
  });

  /**
   * تبديل مقاس الكارت بين 9:16 و 1:1
   */
  setFormat(format: 'story' | 'post') {
    this.currentFormat.set(format);
  }

  /**
   * إظهار أو إخفاء بيانات التايمر من الكارت
   */
  toggleTimer() {
    this.showTimer.update((v) => !v);
  }

  /**
   * المحرك الرئيسي لتحويل الـ DOM لصورة ومشاركتها
   *
   */
  async shareDirectly() {
    const node = this.shareContent.nativeElement;

    try {
      // تحويل العنصر لـ Blob باستخدام التقنيات الحديثة لضمان الألوان والجودة
      const blob = await domToBlob(node, {
        quality: 0.95,
        scale: 2, // جودة مضاعفة لرؤية واضحة في الهواتف الذكية
        backgroundColor: '#0a0a0a',
      });

      if (!blob) return;

      const fileName = `Riwaq-Day-${this.dayNumber}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // محاولة استخدام Web Share API للمشاركة المباشرة للتطبيقات
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Riwaq Expedition: Day ${this.dayNumber}`,
          text: `Mission Accomplished! Day ${this.dayNumber} of my quest: "${this.goal}" on Riwaq! 🚀 #Riwaq #Productivity`,
        });
      } else {
        // Fallback: تحميل الصورة مباشرة إذا كان المتصفح لا يدعم المشاركة
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();

        // تنظيف الرابط من الذاكرة
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      }
    } catch (error) {
      console.error('Share Studio Error:', error);
      alert('Could not generate share image. Please take a manual screenshot.');
    }
  }
}
