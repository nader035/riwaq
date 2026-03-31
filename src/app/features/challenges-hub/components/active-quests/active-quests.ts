/* - Riwaq Active Challenge Room: Performance Master v3.0 */
import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';

// Core Services
import { AuthService } from '../../../../core/auth/auth';
import { ChallengeStore } from '../../../../core/store/challenge.store';
import { SidebarService } from '../../../../core/services/sidebar';
import { ConfirmService } from '../../../../core/services/confirm';

// Components
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton';
import { QuestShareCard } from '../quest-share-card/quest-share-card';

@Component({
  selector: 'app-active-quest',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SkeletonComponent, QuestShareCard],
  templateUrl: './active-quests.html',
  styleUrl: './active-quests.css',
  // 🔥 تحسين الأداء الجذري: لا يتم تحديث المكون إلا عند تغير الـ Signals
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveQuests implements OnInit {
  // --- Injections ---
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public challengeStore = inject(ChallengeStore);
  private auth = inject(AuthService);
  public sidebarService = inject(SidebarService);
  private confirmService = inject(ConfirmService);

  // --- Signals & State ---
  questId = signal<string | null>(null);
  dailyLogs = this.challengeStore.dailyLogs;
  activeQuests = this.challengeStore.activeQuests;
  currentQuest = signal<any>(null);

  // 📊 خريطة الأيام تعتمد على حالة الـ Challenge الحالية
  totalDaysArray = computed(() => {
    const quest = this.currentQuest();
    if (!quest) return [];
    const total = quest.challenges_catalog?.total_days || 14;
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  // 🏁 فحص هل التحدي انتهى بالكامل (اليوم الأخير تم ختمه)
  isQuestFullyCompleted = computed(() => {
    const quest = this.currentQuest();
    const logs = this.dailyLogs();
    if (!quest || logs.length === 0) return false;

    const total = quest.challenges_catalog?.total_days || 14;
    const lastDayLog = logs.find((l) => l.day_number === total);
    return lastDayLog?.is_completed === true;
  });

  selectedDay = signal<any>(null);
  showShareModal = signal(false);
  protected readonly Math = Math;

  constructor() {
    /**
     * 🛡️ Persistence Guard:
     * نراقب حالة المستخدم والـ ID لضمان استعادة البيانات فوراً بعد الـ Refresh
     */
    effect(
      () => {
        const user = this.auth.currentUser();
        const id = this.questId();
        if (user && id && !this.currentQuest()) {
          this.loadQuestData(id, user.id);
        }
      },
      { allowSignalWrites: true },
    );
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.questId.set(id);
    const user = this.auth.currentUser();
    if (id && user) {
      await this.loadQuestData(id, user.id);
    }
  }

  /**
   * 🏗️ محرك جلب البيانات الرئيسي
   */
  async loadQuestData(questId: string, userId: string) {
    if (this.challengeStore.isLoading()) return;

    try {
      // جلب التحديات لو كانت القائمة فارغة (حالة تحديث الصفحة)
      if (this.activeQuests().length === 0) {
        await this.challengeStore.fetchUserActiveQuests(userId);
      }

      const foundQuest = this.activeQuests().find((q) => q.id === questId);

      if (foundQuest) {
        this.currentQuest.set(foundQuest);
        await this.challengeStore.loadQuestDetails(questId, userId);
      } else {
        // إذا لم يعثر على التحدي، نعود للرئيسية
        this.router.navigate(['/app/challenges']);
      }
    } catch (error) {
      console.error('Data Loading Error:', error);
    }
  }

  getLogByNumber(dayNum: number) {
    return this.dailyLogs().find((log) => log.day_number === dayNum);
  }

  /**
   * 🔓 فتح تفاصيل يوم معين
   */
  async openDay(dayNum: number) {
    const quest = this.currentQuest();
    if (!quest || dayNum > quest.current_day) return;

    let log = this.getLogByNumber(dayNum);
    if (!log) {
      const user = this.auth.currentUser();
      if (user) {
        await this.challengeStore.ensureDayExists(quest.id, dayNum);
        await this.challengeStore.loadQuestDetails(quest.id, user.id);
        log = this.getLogByNumber(dayNum);
      }
    }
    if (log) this.selectedDay.set(log);
  }

  /**
   * 📝 تحديث الهدف اليومي
   */
  async updateDailyObjective() {
    const day = this.selectedDay();
    if (day) await this.challengeStore.updateDailyObjective(day.id, day.daily_objective);
  }

  /**
   * ➕ إضافة مهمة (Optimistic Update)
   * يتم تحديث الواجهة فوراً دون انتظار رد السيرفر
   */
  async addTask(title: string) {
    if (!title.trim()) return;
    const day = this.selectedDay();

    const newTask = { id: Date.now(), title, completed: false };
    const updatedTasks = [...(day.tasks || []), newTask];

    // تحديث محلي فوري
    this.selectedDay.update((d) => ({ ...d, tasks: updatedTasks }));

    try {
      await this.challengeStore.updateTasks(day.id, updatedTasks);
    } catch (error) {
      console.error('Failed to sync new task');
    }
  }

  /**
   * ✅ تبديل حالة المهمة (Optimistic Update)
   */
  async toggleTask(task: any) {
    const day = this.selectedDay();

    const updatedTasks = day.tasks.map((t: any) =>
      t.id === task.id ? { ...t, completed: !t.completed } : t,
    );

    // استجابة فورية للضغط (0ms Latency)
    this.selectedDay.update((d) => ({ ...d, tasks: updatedTasks }));

    try {
      await this.challengeStore.updateTasks(day.id, updatedTasks);
    } catch (error) {
      console.error('Failed to sync task toggle');
    }
  }

  /**
   * 🚀 ختم اليوم والمشاركة (Complete Day)
   */
  async sealAndShare() {
    const day = this.selectedDay();
    const quest = this.currentQuest();

    if (day && quest) {
      const totalDays = quest.challenges_catalog?.total_days || 14;
      const nextDay = day.day_number + 1;

      const success = await this.challengeStore.sealDay(day.id, quest.id, nextDay);

      if (success) {
        // تحديث محلي لإبقاء التحدي في الـ Hub والواجهة
        const dayToSet = nextDay > totalDays ? totalDays : nextDay;
        this.currentQuest.update((q) => ({ ...q, current_day: dayToSet }));

        this.showShareModal.set(true);
      }
    }
  }

  /**
   * 🧨 حذف التحدي نهائياً بعد انتهاء الرحلة
   */
  async terminateExpedition() {
    const quest = this.currentQuest();
    if (quest) {
      const confirmed = await this.confirmService.ask(
        'This action is permanent. All progress and recorded focus time for this challenge will be deleted. Continue?',
      );

      if (confirmed) {
        await this.challengeStore.deleteQuestPermanently(quest.id);
      }
    }
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
