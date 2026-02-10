//
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaderboardService } from '../../core/services/leaderboard';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton'; // 👈 تأكد من المسار

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, SkeletonComponent], // 👈 إضافة السكيلتون هنا
  templateUrl: './leaderboard.html',
})
export class LeaderboardComponent implements OnInit, OnDestroy {
  protected leaderboard = inject(LeaderboardService);
  private refreshInterval: any;

  async ngOnInit() {
    // تحميل أولي للبيانات
    await this.leaderboard.fetchDailyTop();

    // تحديث ذكي كل دقيقة لتعقب التغيير في الترتيب أو بداية يوم جديد
    this.refreshInterval = setInterval(async () => {
      const now = new Date();
      // تحويل الوقت لتوقيت القاهرة
      const egyptTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));

      // إذا كانت الساعة 12 منتصف الليل بالضبط، نقوم بطلب تصفير القائمة (لو مش عاملها في السيرفر)
      if (egyptTime.getHours() === 0 && egyptTime.getMinutes() === 0) {
        console.log('🏛️ Riwaq Hall of Fame: Starting a new day...');
      }

      // جلب البيانات بدون إظهار الـ Loading (Background Refresh)
      // ملاحظة: لو حابب تظهر Loading كل مرة، خلي السيرفس تغير الـ Signal قبل الفيتش
      await this.leaderboard.fetchDailyTop();
    }, 60000);
  }

  /**
   * ⏳ تنسيق الوقت بطريقة العلماء
   */
  formatTime(seconds: number): string {
    if (!seconds || seconds < 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }
}
