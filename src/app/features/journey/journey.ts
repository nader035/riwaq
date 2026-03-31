/* - Riwaq Journey Archive: Persistence & Auto-Sync Edition */
import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  computed,
  effect,
  untracked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { JourneyStore } from '../../core/store/journey.store';
import { AuthService } from '../../core/auth/auth';

@Component({
  selector: 'app-journey',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './journey.html',
  // 🔥 OnPush: لضمان سلاسة المتصفح أثناء معالجة الخريطة السنوية
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JourneyComponent implements OnInit, OnDestroy {
  protected journeyStore = inject(JourneyStore);
  protected authService = inject(AuthService);

  private dayFlipInterval: any;

  /**
   * 📊 إجمالي ساعات المعرفة (Lifetime)
   */
  totalKnowledgeHours = computed(() => {
    const seconds = this.authService.currentUser()?.totalFocusSeconds || 0;
    return Math.floor(Number(seconds) / 3600);
  });

  /**
   * 🧩 توليد شبكة الأيام (Heatmap)
   * مزامنة دقيقة مع توقيت القاهرة لضمان توحيد سجلات الرواد
   */
  days = computed(() => {
    const egyptTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
    const egyptNow = new Date(egyptTimeStr);

    // تصفير الوقت للمقارنة الدقيقة بالأيام
    egyptNow.setHours(0, 0, 0, 0);

    const result = [];
    const stats = this.journeyStore.dailyStats();

    for (let i = 364; i >= 0; i--) {
      const d = new Date(egyptNow);
      d.setDate(egyptNow.getDate() - i);

      // تنسيق التاريخ ليتطابق مع شكل المفاتيح في السيرفيس (YYYY-MM-DD)
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const seconds = stats[dateStr] || 0;

      result.push({
        date: dateStr,
        intensity: this.calculateIntensity(seconds),
        hours: (seconds / 3600).toFixed(1),
      });
    }
    return result;
  });

  constructor() {
    /**
     * 🛡️ صمام الأمان للـ Refresh:
     * هذا الـ Effect يراقب حالة المستخدم. أول ما الـ Auth ينجح في جلب الـ Profile
     * بعد الريفرش، سيقوم بجلب بيانات الـ Journey فوراً.
     */
    effect(() => {
      const user = this.authService.currentUser();
      if (user?.id) {
        // نستخدم untracked لمنع الـ Effect من إعادة تشغيل نفسه دون داعٍ
        untracked(() => {
          this.loadJourneyData(user.id);
        });
      }
    });
  }

  async ngOnInit() {
    // محاولة جلب أولية (تعمل في حالة التنقل العادي داخل التطبيق)
    const user = this.authService.currentUser();
    if (user?.id) {
      await this.loadJourneyData(user.id);
    }
    this.setupMidnightWatcher();
  }

  /**
   * 🔄 جلب بيانات الأرشيف بالتوازي لضمان سرعة الاستجابة
   */
  private async loadJourneyData(userId: string | any) {
    console.log('🏛️ Journey Sync: Fetching records for Scholar:', userId);
    try {
      await Promise.all([
        this.journeyStore.fetchHistory(userId),
        this.journeyStore.fetchStreak(userId),
      ]);
    } catch (err) {
      console.error('❌ Journey Sync Failed:', err);
    }
  }

  /**
   * 🕒 مراقب "لحظة الصفر" بتوقيت القاهرة لتحديث اليوم الجديد
   */
  private setupMidnightWatcher() {
    this.dayFlipInterval = setInterval(() => {
      const egyptTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));

      if (egyptTime.getHours() === 0 && egyptTime.getMinutes() === 0) {
        const userId = this.authService.currentUser()?.id;
        if (userId) {
          this.loadJourneyData(userId);
        }
      }
    }, 60000);
  }

  /**
   * 🎨 محرك شدة الألوان بناءً على ساعات التركيز
   */
  private calculateIntensity(seconds: number): number {
    if (seconds === 0) return 0;
    if (seconds < 3600) return 1; // < 1h
    if (seconds < 10800) return 2; // 1-3h
    if (seconds < 21600) return 3; // 3-6h
    return 4; // > 6h 🔥
  }

  ngOnDestroy() {
    if (this.dayFlipInterval) {
      clearInterval(this.dayFlipInterval);
    }
  }
}
