/* - Riwaq Challenges Hub: High-Performance & Natural UX v3.0 */
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Core Services
import { ChallengeStore } from '../../core/store/challenge.store';
import { CatalogItem } from '../../core/models/challenge';
import { AuthService } from '../../core/auth/auth';
import { ConfirmService } from '../../core/services/confirm';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-challenges-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SkeletonComponent],
  templateUrl: './challenges-hub.html',
  styleUrl: './challenges-hub.css',
  // 🔥 المحرك السري للأداء: يمنع إعادة الرسم غير الضرورية
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChallengesHub implements OnInit {
  // --- Injections ---
  private challengeStore = inject(ChallengeStore);
  private auth = inject(AuthService);
  private confirmService = inject(ConfirmService);

  // --- Signals (The Reactive Core) ---
  // الربط المباشر مع سيرفيس التحديات لضمان تدفق البيانات لحظياً
  catalog = this.challengeStore.catalog;
  activeQuests = this.challengeStore.activeQuests;
  isLoading = this.challengeStore.isLoading;
  canStart = this.challengeStore.canStartNewQuest;

  // --- Local UI State ---
  selectedPath = signal<CatalogItem | null>(null);
  userGoal = signal('');
  isModalOpen = signal(false);

  /**
   * 🔄 تهيئة البيانات عند تحميل الـ Hub
   */
  async ngOnInit() {
    const user = this.auth.currentUser();
    const requests: Promise<any>[] = [this.challengeStore.fetchCatalog()];
    
    if (user) {
      requests.push(this.challengeStore.fetchUserActiveQuests(user.id));
    }
    
    await Promise.all(requests);
  }

  /**
   * 🖱️ التمرير السلس لقسم الأرشيف عند الضغط على "Start New Challenge"
   */
  scrollToArchive() {
    const archiveElement = document.getElementById('discovery-archive');
    if (archiveElement) {
      archiveElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  /**
   * 🔓 فتح نافذة البدء مع التحقق من المساحة المتاحة (3/3)
   */
  openInitiateModal(path: CatalogItem) {
    if (!this.canStart()) {
      this.confirmService.ask(
        'All slots are occupied (3/3). Please complete or delete an active challenge to start a new one.',
      );
      return;
    }
    this.selectedPath.set(path);
    this.isModalOpen.set(true);
  }

  /**
   * 🚀 إطلاق التحدي الجديد وحفظه في السحاب
   */
  async startNewQuest() {
    const user = this.auth.currentUser();
    const path = this.selectedPath();

    if (user && path && this.userGoal().trim()) {
      try {
        await this.challengeStore.startQuest(user.id, path, this.userGoal());
        this.closeModal();
      } catch (e) {
        console.error('Failed to start challenge:', e);
      }
    }
  }

  /**
   * 🧹 تنظيف الحالة عند إغلاق النافذة
   */
  closeModal() {
    this.isModalOpen.set(false);
    this.selectedPath.set(null);
    this.userGoal.set('');
  }

  /**
   * 📊 حساب النسبة المئوية للتقدم بدقة
   */
  getPercent(current: number, total: number): number {
    if (!total || total === 0) return 0;
    // نضمن بقاء النسبة ضمن نطاق 0-100
    const percent = Math.round((current / total) * 100);
    return Math.min(100, Math.max(0, percent));
  }

  /**
   * 🧨 حذف التحدي نهائياً (Hard Delete) لفتح مساحة فورية
   */
  async confirmDelete(event: Event, questId: string) {
    event.stopPropagation(); // منع التوجيه لصفحة التحدي عند الضغط على زر الحذف

    const confirmed = await this.confirmService.ask(
      'Are you sure you want to permanently delete this challenge? All progress and daily records will be lost.',
    );

    if (confirmed) {
      // التخزين يتولى إدارةالة التحميل (isLoading) والتعامل مع الأخطاء
      await this.challengeStore.deleteQuestPermanently(questId);
    }
  }

  /**
   * ✅ فحص بصري لحالة اكتمال التحدي
   */
  isCompleted(quest: any): boolean {
    const total = quest.challenges_catalog?.total_days || 14;
    return quest.current_day >= total;
  }
}
