/* - Riwaq Intelligence Dashboard: Ultimate Performance Master v3.1 */
import {
  Component,
  inject,
  computed,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

// Core Services Injection
import { AuthService } from '../../core/auth/auth';
import { Focus } from '../../core/services/focus';
import { RoomService } from '../../core/services/room';
import { SidebarService } from '../../core/services/sidebar';
import { TaskService } from '../../core/services/task';
import { JourneyService } from '../../core/services/journey';
import { ChallengeService } from '../../core/services/challenge';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton';
import { NotificationService } from '../../core/services/notification';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  templateUrl: './dashboard.html',
  // 🔥 OnPush Strategy: المحرك لا يعمل إلا عند تغير الـ Signals فعلياً
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  // --- Injections ---
  protected authService = inject(AuthService);
  protected focus = inject(Focus);
  protected roomService = inject(RoomService);
  protected taskService = inject(TaskService);
  protected challengeService = inject(ChallengeService);
  protected sidebarService = inject(SidebarService);
  protected journeyService = inject(JourneyService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  // حالة التحميل المركزية للتحكم في الـ Skeleton
  loading = signal(true);

  // --- 🧠 الحسابات الذكية (Computed Signals) لسرعة البرق ---

  /**
   * دمج الوقت اليومي (المخزن في البروفايل + الجاري حالياً في الغرفة)
   */
  dailySeconds = computed(() => {
    const user = this.authService.currentUser();
    const saved = user?.dailyFocusSeconds || 0;
    const active = this.focus.currentRoomId() ? this.focus.totalSeconds() : 0;
    return saved + active;
  });

  dailyTime = computed(() => this.formatTimeDetailed(this.dailySeconds()));

  /**
   * الوقت الكلي للحساب (Lifetime Stats)
   */
  totalLifetimeTime = computed(() => {
    const user = this.authService.currentUser();
    const savedTotal = user?.totalFocusSeconds || 0;
    const active = this.focus.currentRoomId() ? this.focus.totalSeconds() : 0;
    return this.formatTimeDetailed(Number(savedTotal) + active);
  });

  /**
   * حساب النسبة المئوية للهدف اليومي (مثلاً 4 ساعات)
   */
  dailyProgressPercentage = computed(() => {
    const goalSeconds = 14400; // 4 Hours Goal
    return Math.min((this.dailySeconds() / goalSeconds) * 100, 100);
  });

  // بيانات الواجهة المبسطة (Data Projection)
  firstName = computed(() => this.authService.currentUser()?.name?.split(' ')[0] || 'Scholar');
  activeRooms = computed(() => this.roomService.rooms().slice(0, 3));

  completedTasksCount = computed(
    () => this.taskService.tasks().filter((t) => t.is_completed).length,
  );
  totalTasksCount = computed(() => this.taskService.tasks().length);

  /**
   * 🚀 المزامنة المتوازية عند الإقلاع
   */
  async ngOnInit() {
    try {
      const session = this.authService.session();
      const userId = session?.user?.id;

      if (!userId) return;

      // تنفيذ كافة الطلبات في نفس الوقت (Parallel Execution) لتقليل الـ Latency
      await Promise.all([
        this.authService.refreshUserProfile(session),
        this.roomService.fetchRooms(),
        this.taskService.fetchTasks(),
        this.challengeService.fetchUserActiveQuests(userId),
        this.journeyService.fetchStreak(userId),
        this.journeyService.fetchHistory(userId),
      ]);
    } catch (err) {
      console.error('Dashboard Load Failure:', err);
    } finally {
      // إغلاق الـ Skeleton فوراً عند جاهزية البيانات
      this.loading.set(false);
    }
  }

  // --- 🛠️ العمليات (Operations) ---

  /**
   * ✅ حل المشكلة: دالة فتح نافذة إنشاء الغرفة
   * نقوم بتمرير حالة (State) لصفحة الغرف لتفتح المودال هناك تلقائياً
   */
  openCreateRoomModal() {
    this.router.navigate(['/app/rooms'], { state: { openModal: true } });
  }

  /**
   * 🚪 الخروج المنظم من الغرفة الحالية
   */
  async handleQuitRoom() {
    try {
      await this.roomService.leaveRoom();
      this.focus.reset();
      this.notify.show('Session finished.', 'info');
    } catch (e) {
      this.notify.show('Disconnect error.', 'error');
    }
  }

  /**
   * تنسيق الوقت الاحترافي (HD Duration Format)
   */
  private formatTimeDetailed(totalSeconds: number): string {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hrs === 0) return `${pad(mins)}m`;
    return `${hrs}h ${pad(mins)}m`;
  }
}
