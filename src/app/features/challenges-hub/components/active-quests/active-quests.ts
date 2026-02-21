/* - Riwaq Active Quest Room: Master Engine v2.0 */
import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';
import { ChallengeService } from '../../../../core/services/challenge';
import { QuestShareCard } from '../quest-share-card/quest-share-card';
import { SidebarService } from '../../../../core/services/sidebar';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton';
import { ConfirmService } from '../../../../core/services/confirm'; // ✅ استيراد سيرفيس التأكيد

@Component({
  selector: 'app-active-quest',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, QuestShareCard, SkeletonComponent],
  templateUrl: './active-quests.html',
  styleUrl: './active-quests.css',
})
export class ActiveQuests implements OnInit {
  // --- Injections ---
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public challengeService = inject(ChallengeService);
  private auth = inject(AuthService);
  public sidebarService = inject(SidebarService);
  private confirmService = inject(ConfirmService); // ✅ حقن سيرفيس التأكيد

  // --- Signals & State ---
  questId = signal<string | null>(null);
  dailyLogs = this.challengeService.dailyLogs;
  activeQuests = this.challengeService.activeQuests;
  currentQuest = signal<any>(null);

  // الخريطة تعتمد على الـ currentQuest
  totalDaysArray = computed(() => {
    const quest = this.currentQuest();
    if (!quest) return [];
    const total = quest.challenges_catalog?.total_days || 14;
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  // 🏁 فحص هل التحدي انتهى بالكامل (اليوم الأخير مكتمل)
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
     * 🛡️ الحل الجذري للريفريش: مراقبة حالة اليوزر
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
   * 🏗️ محرك تحميل البيانات الرئيسي
   */
  async loadQuestData(questId: string, userId: string) {
    if (this.challengeService.isLoading()) return;

    this.challengeService.isLoading.set(true);
    try {
      if (this.activeQuests().length === 0) {
        await this.challengeService.fetchUserActiveQuests(userId);
      }

      const foundQuest = this.activeQuests().find((q) => q.id === questId);

      if (foundQuest) {
        this.currentQuest.set(foundQuest);
        await this.challengeService.loadQuestDetails(questId, userId);
      } else {
        this.router.navigate(['/app/challenges']);
      }
    } catch (error) {
      console.error('Persistence Load Error:', error);
    } finally {
      this.challengeService.isLoading.set(false);
    }
  }

  getLogByNumber(dayNum: number) {
    return this.dailyLogs().find((log) => log.day_number === dayNum);
  }

  /**
   * 🔓 فتح محطة معينة
   */
  async openDay(dayNum: number) {
    const quest = this.currentQuest();
    if (!quest || dayNum > quest.current_day) return;

    let log = this.getLogByNumber(dayNum);
    if (!log) {
      const user = this.auth.currentUser();
      if (user) {
        await this.challengeService.ensureDayExists(quest.id, dayNum);
        await this.challengeService.loadQuestDetails(quest.id, user.id);
        log = this.getLogByNumber(dayNum);
      }
    }
    if (log) this.selectedDay.set(log);
  }

  /**
   * 📝 تحديث هدف اليوم
   */
  async updateDailyObjective() {
    const day = this.selectedDay();
    if (day) await this.challengeService.updateDailyObjective(day.id, day.daily_objective);
  }

  /**
   * ➕ إضافة مهمة
   */
  async addTask(title: string) {
    if (!title.trim()) return;
    const day = this.selectedDay();
    const updatedTasks = [...(day.tasks || []), { id: Date.now(), title, completed: false }];
    await this.challengeService.updateTasks(day.id, updatedTasks);
    this.selectedDay.update((d) => ({ ...d, tasks: updatedTasks }));
  }

  /**
   * ✅ تبديل حالة المهمة
   */
  async toggleTask(task: any) {
    const day = this.selectedDay();
    const updatedTasks = day.tasks.map((t: any) =>
      t.id === task.id ? { ...t, completed: !t.completed } : t,
    );
    await this.challengeService.updateTasks(day.id, updatedTasks);
    this.selectedDay.update((d) => ({ ...d, tasks: updatedTasks }));
  }

  /**
   * 🚀 ختم اليوم والمشاركة
   */
  async sealAndShare() {
    const day = this.selectedDay();
    const quest = this.currentQuest();

    if (day && quest) {
      const totalDays = quest.challenges_catalog?.total_days || 14;
      const nextDay = day.day_number + 1;

      // 🛡️ يتم التعامل مع nextDay داخل السيرفيس لضمان عدم تخطي إجمالي الأيام
      const success = await this.challengeService.sealDay(day.id, quest.id, nextDay);

      if (success) {
        // تحديث محلي سريع للـ UI
        const dayToSet = nextDay > totalDays ? totalDays : nextDay;
        this.currentQuest.update((q) => ({ ...q, current_day: dayToSet }));

        this.showShareModal.set(true);
      }
    }
  }

  /**
   * 🧨 مسح التحدي نهائياً باستخدام ConfirmService
   */
  async terminateExpedition() {
    const quest = this.currentQuest();
    if (quest) {
      // ✅ استخدام السيرفيس الجديدة بـ await
      const confirmed = await this.confirmService.ask(
        'This action is final. Your progress, focus data, and logs for this expedition will be erased forever. Proceed?',
      );

      if (confirmed) {
        await this.challengeService.deleteQuestPermanently(quest.id);
      }
    }
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
