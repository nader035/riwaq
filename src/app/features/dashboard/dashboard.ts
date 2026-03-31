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
import { FocusStore } from '../../core/store/focus.store';
import { RoomStore } from '../../core/store/room.store';
import { SidebarService } from '../../core/services/sidebar';
import { TaskStore } from '../../core/store/task.store';
import { JourneyStore } from '../../core/store/journey.store';
import { ChallengeStore } from '../../core/store/challenge.store';
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
  protected focus = inject(FocusStore);
  protected roomStore = inject(RoomStore);
  protected taskStore = inject(TaskStore);
  protected challengeStore = inject(ChallengeStore);
  protected sidebarService = inject(SidebarService);
  protected journeyStore = inject(JourneyStore);
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
  activeRooms = computed(() => this.roomStore.rooms().slice(0, 3));

  completedTasksCount = computed(
    () => this.taskStore.tasks().filter((t) => t.is_completed).length,
  );
  totalTasksCount = computed(() => this.taskStore.tasks().length);

  /**
   * 🚀 المزامنة المتوازية عند الإقلاع
   */
  async ngOnInit() {
    try {
      const session = this.authService.session();
      const userId = session?.user?.id;

      if (!userId) return;

      await this.authService.refreshUserProfile(session);

      // تنفيذ باقي الطلبات في نفس الوقت (Parallel Execution) بعد الاطمئنان على هوية المستخدم
      await Promise.all([
        this.roomStore.fetchRooms(),
        this.taskStore.fetchTasks(),
        this.challengeStore.fetchUserActiveQuests(userId),
        this.journeyStore.fetchStreak(userId),
        this.journeyStore.fetchHistory(userId),
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
    const elapsed = this.focus.elapsedSeconds();

    // 1. حفظ الوقت وتصفير العداد أولاً (قاعدة البيانات تتطلب وجود المستخدم في الغرفة)
    if (elapsed >= 10) {
      await this.focus.saveProgress(elapsed);
    } else {
      if (elapsed > 0) {
        this.notify.show('Session too short to archive.', 'info');
      }
      this.focus.reset();
    }

    // 2. مسح اليوزر من الغرفة بعد حفظ الجلسة بنجاح
    await this.roomStore.leaveRoom();
    this.focus.clearRoom();

    this.notify.show('Sanctuary cleared. Systems standby.', 'success');
  } catch (e) {
    console.error('Quit error:', e);
    this.focus.reset(); // تصفير إجباري لو حصل مشكلة
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
