/* - Riwaq Navigation Architecture: Optimized & Reactive HUD v3.1 */
import { 
  Component, 
  inject, 
  computed, 
  ChangeDetectionStrategy 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Core Services
import { AuthService } from '../../../core/auth/auth';
import { SidebarService } from '../../../core/services/sidebar';
import { JourneyService } from '../../../core/services/journey';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  // 🔥 OnPush Strategy: السايدبار يظل صامتاً برمجياً حتى تتغير الـ Signals
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  // --- Injections ---
  public authService = inject(AuthService);
  public sidebarService = inject(SidebarService);
  protected journeyService = inject(JourneyService);

  /**
   * 🗺️ خريطة التنقل: تم ترتيب العناصر بناءً على سيكولوجية المستخدم (The F-Pattern)
   * تبدأ بالوعي (Dashboard) ثم التنفيذ (Rooms/Tasks) ثم المكافأة (Journey/Leaderboard)
   */
  protected navItems = [
    { link: '/app/dashboard', icon: 'fas fa-th-large', label: 'Dashboard' },
    { link: '/app/rooms', icon: 'fas fa-door-open', label: 'Study Rooms' },
    { link: '/app/tasks', icon: 'fas fa-tasks', label: 'Tasks' },
    { link: '/app/challenges', icon: 'fas fa-fire-alt', label: 'Challenges' },
    { link: '/app/journey', icon: 'fas fa-map-signs', label: 'Journey' },
    { link: '/app/leaderboard', icon: 'fas fa-medal', label: 'Leaderboard' },
    { link: '/app/profile', icon: 'fas fa-user', label: 'Profile' },
  ];

  /**
   * 🧠 بيانات الهوية اللحظية (Reactive Identity)
   * يتم تحديثها تلقائياً فور تعديل الاسم أو الصورة في البروفايل
   */
  userProfile = computed(() => {
    const user = this.authService.currentUser();
    return {
      name: user?.name || 'Scholar',
      avatar: user?.avatar,
      initial: user?.name?.trim().charAt(0).toUpperCase() || 'S',
      role: user?.role || 'scholar',
      streak: this.journeyService.currentStreak() || 0
    };
  });

  /**
   * 🚪 معالج الخروج المنظم
   */
  handleLogout() {
    this.authService.logout();
  }
}