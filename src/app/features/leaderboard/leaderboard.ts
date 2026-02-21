/* - Riwaq Hall of Fame: Ultimate Performance & High-Precision Tracking */
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaderboardService } from '../../core/services/leaderboard';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  templateUrl: './leaderboard.html',
  // 🔥 OnPush Strategy: المكون لا يعيد الرسم إلا عند تحديث الـ Signals
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardComponent implements OnInit, OnDestroy {
  // --- Injections ---
  protected leaderboard = inject(LeaderboardService);

  // --- Local State ---
  private refreshInterval: any;

  /**
   * 🔄 تهيئة لوحة الشرف عند البدء
   */
  async ngOnInit() {
    // تحميل أولي للبيانات (يستفيد مباشرة من Index total_focus_seconds)
    await this.leaderboard.fetchDailyTop();

    // تحديث ذكي في الخلفية (Background Sync) كل 60 ثانية
    // يضمن بقاء الترتيب حياً دون إزعاج المستخدم بـ Skeletons متكررة
    this.refreshInterval = setInterval(async () => {
      const now = new Date();
      // توقيت القاهرة لضمان تزامن الجميع في نفس اليوم
      const egyptTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));

      // رصد بداية يوم جديد لتصفير العدادات ذهنياً وبصرياً
      if (egyptTime.getHours() === 0 && egyptTime.getMinutes() === 0) {
        console.log('🏛️ Hall of Fame: New cycle initiated.');
      }

      await this.leaderboard.fetchDailyTop();
    }, 60000);
  }

  /**
   * ⏳ تنسيق وقت التركيز (HD Duration Format)
   * يعرض الساعات والدقائق بوضوح فائق
   */
  formatTime(seconds: number): string {
    if (!seconds || seconds <= 0) return '0m';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }

  /**
   * 🧹 تنظيف الذاكرة ومنع تسريب الـ Intervals
   */
  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
