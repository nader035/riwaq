//
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth';
import { JourneyService } from '../../core/services/journey';
import { NotificationService } from '../../core/services/notification';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
})
export class ProfileComponent implements OnInit {
  protected authService = inject(AuthService);
  protected journeyService = inject(JourneyService);
  private supabase = inject(SupabaseService).supabase;
  private notify = inject(NotificationService);

  loading = signal(false);
  editMode = signal(false);
  newName = '';

  // --- 🧠 الحسابات الذكية (Signals) ---

  /**
   * حساب مستوى الطالب: ليفل جديد كل 10 ساعات مذاكرة كليّة
   */
  userLevel = computed(() => {
    const hours = (this.authService.currentUser()?.totalFocusSeconds || 0) / 3600;
    return Math.floor(hours / 10) + 1;
  });

  /**
   * شريط التقدم اليومي بناءً على هدف الـ 4 ساعات
   */
  dailyProgress = computed(() => {
    const daily = this.authService.currentUser()?.dailyFocusSeconds || 0;
    return Math.min((daily / 14400) * 100, 100);
  });

  /**
   * 🚀 مزامنة البيانات عند فتح الصفحة
   */
  async ngOnInit() {
    this.loading.set(true);
    const session = this.authService.session();
    const userId = session?.user?.id;

    if (userId) {
      // 🎯 الإصلاح: تمرير الـ userId لفك أي تعارض برمي ولحل خطأ TS2554
      await Promise.all([
        this.authService.refreshUserProfile(session),
        this.journeyService.fetchStreak(userId), //
      ]);

      this.newName = this.authService.currentUser()?.name || '';
    }
    this.loading.set(false);
  }

  /**
   * 🛠️ فتح وضع التعديل مع مزامنة الاسم فوراً
   */
  startEdit() {
    this.newName = this.authService.currentUser()?.name || '';
    this.editMode.set(true);
  }

  /**
   * 💾 حفظ الهوية وتحديث قاعدة البيانات والـ Metadata
   */
  async updateProfile() {
    const nameToSave = this.newName.trim();
    if (nameToSave.length < 3) {
      this.notify.show('A scholar needs a proper name (min 3 chars).', 'error');
      return;
    }

    this.loading.set(true);
    try {
      const user = this.authService.currentUser();
      if (!user) return;

      // 1. تحديث جدول الـ Profiles
      const { error: dbError } = await this.supabase
        .from('profiles')
        .update({ name: nameToSave })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // 2. تحديث Metadata الهوية لضمان تزامن الـ Auth
      await this.supabase.auth.updateUser({ data: { full_name: nameToSave } });

      // 3. التحديث اللحظي للـ Signal لتغيير الاسم في السايدبار فوراً
      this.authService.currentUser.update((prev) => (prev ? { ...prev, name: nameToSave } : null));

      this.notify.show('Identity updated, Scholar.', 'success');
      this.editMode.set(false);
    } catch (err) {
      this.notify.show('The archives are currently locked.', 'error');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  getUserInitial(name: string | undefined): string {
    return name?.trim().charAt(0).toUpperCase() || 'S';
  }
}
