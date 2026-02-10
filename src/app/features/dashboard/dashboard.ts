import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

// استيراد الخدمات الأساسية لـ "رُواق"
import { AuthService } from '../../core/auth/auth';
import { Focus } from '../../core/services/focus';
import { RoomService } from '../../core/services/room';
import { SidebarService } from '../../core/services/sidebar';
import { TaskService } from '../../core/services/task';
import { JourneyService } from '../../core/services/journey';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton';
import { NotificationService } from '../../core/services/notification';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  // 1. حقن الخدمات (Dependency Injection)
  protected authService = inject(AuthService);
  protected focus = inject(Focus);
  protected roomService = inject(RoomService);
  protected taskService = inject(TaskService);
  protected sidebarService = inject(SidebarService);
  protected journeyService = inject(JourneyService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  // حالة التحميل (Signal) للتحكم في ظهور الـ Skeleton
  loading = signal(true);

  // --- 🧠 الحسابات الذكية (Computed Signals) لرفع الأداء بنسبة 90% ---

  /**
   * حساب الوقت اليومي (المخزن في البروفايل + الثواني الجارية في الغرفة حالياً)
   */
  dailySeconds = computed(() => {
    const user = this.authService.currentUser();
    const saved = user?.dailyFocusSeconds || 0;
    // إضافة الثواني الجارية فقط إذا كان هناك Session نشطة فعلياً
    const active = this.focus.currentRoomId() ? this.focus.elapsedSeconds() : 0;
    return saved + active;
  });

  dailyTime = computed(() => this.formatTimeDetailed(this.dailySeconds()));

  /**
   * حساب الوقت الكلي للحساب (Total Lifetime) منذ بداية الرحلة
   */
  totalLifetimeTime = computed(() => {
    const user = this.authService.currentUser();
    const savedTotal = user?.totalFocusSeconds || 0;
    const active = this.focus.currentRoomId() ? this.focus.elapsedSeconds() : 0;
    return this.formatTimeDetailed(savedTotal + active);
  });

  // فحص هل تم الوصول للهدف اليومي (4 ساعات = 14400 ثانية)
  isGoalReached = computed(() => this.dailySeconds() >= 14400);

  // حساب النسبة المئوية للتقدم اليومي
  dailyProgressPercentage = computed(() => {
    const goalSeconds = 14400;
    return Math.min((this.dailySeconds() / goalSeconds) * 100, 100);
  });

  // استخراج البيانات المبسطة للواجهة لتقليل العمليات داخل الـ HTML
  firstName = computed(() => this.authService.currentUser()?.name?.split(' ')[0] || 'Scholar');
  studyRooms = computed(() => this.roomService.rooms().slice(0, 3));

  completedTasksCount = computed(
    () => this.taskService.tasks().filter((t) => t.is_completed).length,
  );
  totalTasksCount = computed(() => this.taskService.tasks().length);

  /**
   * 🚀 المزامنة المتوازية (ngOnInit)
   */
  async ngOnInit() {
    try {
      const session = this.authService.session();
      const userId = session?.user?.id;

      // تنفيذ كافة النداءات في نفس الوقت لتقليل وقت التحميل (LCP)
      await Promise.all([
        this.authService.refreshUserProfile(session),
        this.roomService.fetchRooms(),
        this.taskService.fetchTasks(),
        userId ? this.journeyService.fetchStreak(userId) : Promise.resolve(),
        userId ? this.journeyService.fetchHistory(userId) : Promise.resolve(),
      ]);
    } catch (err) {
      console.error('⚠️ Dashboard Sync Error:', err);
    } finally {
      // إغلاق وضع التحميل فور جاهزية البيانات
      this.loading.set(false);
    }
  }

  // --- 🛠️ العمليات (Operations) ---

  /**
   * فتح نافذة إنشاء غرفة جديدة عن طريق تمرير حالة للـ RoomsComponent
   */
  openCreateRoomModal() {
    this.router.navigate(['/app/rooms'], { state: { openModal: true } });
  }

  /**
   * 🚪 الخروج المنظم من الغرفة (Fix المعتمد)
   */
  async handleQuitRoom() {
    const roomId = this.focus.currentRoomId();
    if (roomId) {
      // 1. إزالة اليوزر من جدول التتبع (Presence Tracking) في سوبابيس
      await this.roomService.leaveRoom(roomId);
    }

    // 2. تصفير العداد ومسح roomId و roomName محلياً
    // هذا السطر هو المسؤول عن إخفاء كارت الجلسة النشطة فوراً
    this.focus.reset();

    // 3. إظهار تنبيه للمستخدم
    this.notify.show('Sanctuary session terminated.', 'info');
  }

  /**
   * تنسيق الوقت الاحترافي (00h 00m 00s) أو (00m 00s)
   */
  private formatTimeDetailed(totalSeconds: number): string {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hrs === 0) return `${pad(mins)}m ${pad(secs)}s`;
    return `${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s`;
  }
}
