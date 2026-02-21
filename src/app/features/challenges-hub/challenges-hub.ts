/* - Riwaq Challenges Hub: Enhanced Logic v2.0 */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChallengeService, CatalogItem } from '../../core/services/challenge';
import { AuthService } from '../../core/auth/auth';
import { ConfirmService } from '../../core/services/confirm'; // ✅ استيراد سيرفيس التأكيد المخصصة

@Component({
  selector: 'app-challenges-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './challenges-hub.html',
  styleUrl: './challenges-hub.css',
})
export class ChallengesHub implements OnInit {
  private challengeService = inject(ChallengeService);
  private auth = inject(AuthService);
  private confirmService = inject(ConfirmService); // ✅ حقن سيرفيس التأكيد

  // 🔗 الربط مع الـ Signals المركزية في السيرفيس
  catalog = this.challengeService.catalog;
  activeQuests = this.challengeService.activeQuests;
  isLoading = this.challengeService.isLoading;
  canStart = this.challengeService.canStartNewQuest;

  // 🧪 حالات الواجهة المحلية
  selectedPath = signal<CatalogItem | null>(null);
  userGoal = signal('');
  isModalOpen = signal(false);

  /**
   * 🔄 تهيئة البيانات عند فتح الـ Hub
   */
  async ngOnInit() {
    await this.challengeService.fetchCatalog();
    const user = this.auth.currentUser();
    if (user) {
      await this.challengeService.fetchUserActiveQuests(user.id);
    }
  }

  /**
   * 🔓 فتح نافذة بدء مهمة جديدة مع التحقق من السعة (3/3)
   */
  openInitiateModal(path: CatalogItem) {
    if (!this.canStart()) {
      // استخدام سيرفيس التأكيد لعرض رسالة تنبيه فخمة بدل alert
      this.confirmService.ask(
        'Mission Capacity Reached (3/3). You must conclude an existing quest to initiate a new expedition.',
      );
      return;
    }
    this.selectedPath.set(path);
    this.isModalOpen.set(true);
  }

  /**
   * 🚀 إطلاق المهمة الجديدة وحفظها في قاعدة البيانات
   */
  async startNewQuest() {
    const user = this.auth.currentUser();
    const path = this.selectedPath();

    if (user && path && this.userGoal().trim()) {
      try {
        await this.challengeService.startQuest(user.id, path, this.userGoal());
        this.closeModal();
      } catch (e) {
        console.error('Failed to initiate quest:', e);
      }
    }
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedPath.set(null);
    this.userGoal.set('');
  }

  /**
   * 📊 حساب النسبة المئوية للتقدم في كروت التحديات النشطة
   */
  getPercent(current: number, total: number): number {
    if (!total || total === 0) return 0;
    // نضمن أن النسبة لا تتعدى 100% حتى لو الـ current_day زاد برمجياً
    const percent = Math.round((current / total) * 100);
    return percent > 100 ? 100 : percent;
  }

  /**
   * 🧨 مسح التحدي نهائياً من الـ Hub (Hard Delete)
   */
  async confirmDelete(event: Event, questId: string) {
    event.stopPropagation(); // منع التوجيه لصفحة التحدي عند الضغط على زر الحذف

    // ✅ استخدام سيرفيس التأكيد المخصصة بأسلوب الـ Promise
    const confirmed = await this.confirmService.ask(
      'Are you sure you want to permanently erase this expedition? All progress and recorded logs will be lost forever.',
    );

    if (confirmed) {
      try {
        this.challengeService.isLoading.set(true);
        // نستخدم Delete Permanently لضمان تنظيف الداتابيز وفتح Slot جديد
        await this.challengeService.deleteQuestPermanently(questId);
      } catch (error) {
        console.error('Failed to terminate quest:', error);
      } finally {
        this.challengeService.isLoading.set(false);
      }
    }
  }

  /**
   * 🏁 التحقق هل المهمة منتهية بصرياً؟ (لإظهار شعار الإنجاز في الـ Hub)
   */
  isCompleted(quest: any): boolean {
    return quest.current_day >= quest.challenges_catalog?.total_days;
  }
}
