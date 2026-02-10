//
import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JourneyService } from '../../core/services/journey';
import { AuthService } from '../../core/auth/auth';

@Component({
  selector: 'app-journey',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './journey.html',
})
export class JourneyComponent implements OnInit, OnDestroy {
  protected journeyService = inject(JourneyService);
  protected authService = inject(AuthService);

  // معرف المؤقت لمراقبة تغيير اليوم بتوقيت القاهرة
  private dayFlipInterval: any;

  /**
   * 📊 إجمالي ساعات المعرفة (Lifetime)
   * يتم تحديثه تلقائياً عند تغيير بيانات المستخدم في الـ AuthService
   */
  totalKnowledgeHours = computed(() => {
    const seconds = this.authService.currentUser()?.totalFocusSeconds || 0;
    return Math.floor(seconds / 3600);
  });

  /**
   * 🧩 توليد شبكة الأيام (Heatmap) - مزامنة 100% مع توقيت القاهرة
   */
  days = computed(() => {
    // 1. الحصول على التاريخ الحالي في القاهرة حصراً لضمان توحيد اليوم للكل
    const egyptTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
    const egyptNow = new Date(egyptTimeStr);

    const result = [];
    const stats = this.journeyService.dailyStats();

    // 2. توليد 365 يوم رجوعاً من تاريخ القاهرة الحالي
    for (let i = 364; i >= 0; i--) {
      const d = new Date(egyptNow);
      d.setDate(egyptNow.getDate() - i);

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

  /**
   * 🚀 دورة الحياة: جلب البيانات باستخدام معرف المستخدم لفك التعارض
   */
  async ngOnInit() {
    const user = this.authService.currentUser();
    if (user?.id) {
      await this.loadJourneyData(user.id);
    }
    this.setupMidnightWatcher();
  }

  /**
   * 🔄 جلب البيانات التاريخية والـ Streak
   * @param userId معرف المستخدم لفك الارتباط الدائري بين الخدمات
   */
  private async loadJourneyData(userId: string) {
    //
    await Promise.all([
      this.journeyService.fetchHistory(userId),
      this.journeyService.fetchStreak(userId)  
    ]);
  }

  /**
   * 🕒 مراقب منتصف الليل بتوقيت القاهرة
   * يقوم بتحديث الواجهة فوراً عند بدء يوم جديد
   */
  private setupMidnightWatcher() {
    this.dayFlipInterval = setInterval(() => {
      const egyptTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));

      // إذا كانت الساعة 00:00 (بداية دقيقة منتصف الليل)
      if (egyptTime.getHours() === 0 && egyptTime.getMinutes() === 0) {
        const userId = this.authService.currentUser()?.id;
        if (userId) {
          console.log('🏛️ Riwaq: Cairo Midnight reached. Refreshing Journey...');
          this.loadJourneyData(userId);
        }
      }
    }, 60000); // يفحص كل دقيقة
  }

  /**
   * 🎨 حساب شدة اللون بناءً على المجهود (مقياس رُواق)
   */
  private calculateIntensity(seconds: number): number {
    if (seconds === 0) return 0;
    if (seconds < 3600) return 1;    // أقل من ساعة
    if (seconds < 10800) return 2;  // 1-3 ساعات
    if (seconds < 21600) return 3;  // 3-6 ساعات
    return 4;                       // أكثر من 6 ساعات 🔥
  }

  ngOnDestroy() {
    if (this.dayFlipInterval) {
      clearInterval(this.dayFlipInterval);
    }
  }
}