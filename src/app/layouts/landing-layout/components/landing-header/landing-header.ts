/* - Riwaq Header Logic: Reactive Navigation & Session Guard v3.2 */
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-landing-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './landing-header.html',
  styleUrl: './landing-header.css',
  // 🔥 OnPush: لضمان أداء فائق السرعة وعدم استهلاك المعالج أثناء الـ Scroll
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingHeader {
  // --- Injections ---
  protected auth = inject(AuthService);
  private router = inject(Router);

  /**
   * 🖼️ هوية الأرشيف الافتراضية
   * المسار المطلق للصورة في حالة عدم وجود صورة شخصية للمستخدم
   */
  protected readonly DEFAULT_AVATAR = 'assets/images/default-avatar.png';

  /**
   * 🗺️ روابط التنقل السريع (Authenticated Only)
   * تم ترتيبها لتعطي الأولوية للمهام اليومية (The Workflow Order)
   */
  protected navItems = [
    { link: '/app/dashboard', icon: 'fas fa-th-large', label: 'Dashboard' },
    { link: '/app/rooms', icon: 'fas fa-door-open', label: 'Study Rooms' },
    { link: '/app/tasks', icon: 'fas fa-tasks', label: 'Tasks' },
    { link: '/app/leaderboard', icon: 'fas fa-medal', label: 'Leaderboard' },
  ];
  /**
   * 🛡️ صمام أمان الصور (Image Fallback)
   * يتم استدعاؤه فوراً عند فشل تحميل صورة المستخدم لضمان سلامة الـ UI
   */
  handleImageError(event: any) {
    if (event.target.src !== this.DEFAULT_AVATAR) {
      event.target.src = this.DEFAULT_AVATAR;
    }
  }

  /**
   * 🚪 إنهاء الجلسة والعودة لبوابة الأرشيف
   */
  async logout() {
    try {
      await this.auth.logout();
      // التوجيه للصفحة الرئيسية بعد مسح البيانات لضمان عدم وجود "أشباح" بيانات
      await this.router.navigate(['/']);
    } catch (err) {
      console.error('Logout Sequence Failed:', err);
    }
  }
}
