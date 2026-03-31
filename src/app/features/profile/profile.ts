/* - Riwaq Profile System: High-Performance & HD Identity v3.0 */
import { 
  Component, 
  inject, 
  signal, 
  computed, 
  OnInit, 
  ChangeDetectionStrategy 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Core Services Injection
import { AuthService } from '../../core/auth/auth';
import { JourneyStore } from '../../core/store/journey.store';
import { NotificationService } from '../../core/services/notification';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  // 🔥 OnPush Strategy: المكون لا يتحرك إلا عند تغير الـ Signals الحقيقية
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  // --- Injections ---
  protected authService = inject(AuthService);
  protected journeyStore = inject(JourneyStore);
  private supabase = inject(SupabaseService).supabase;
  private notify = inject(NotificationService);

  // --- UI State Signals ---
  loading = signal(false);
  editMode = signal(false);
  newName = '';

  // --- 🧠 الحسابات الذكية (Computed Signals) ---

  /**
   * حساب مستوى الطالب: ليفل جديد كل 10 ساعات تركيز كلية
   */
  userLevel = computed(() => {
    const totalSeconds = this.authService.currentUser()?.totalFocusSeconds || 0;
    const hours = Number(totalSeconds) / 3600;
    return Math.floor(hours / 10) + 1;
  });

  /**
   * حساب التقدم نحو هدف اليوم (4 ساعات)
   */
  dailyProgress = computed(() => {
    const dailySeconds = this.authService.currentUser()?.dailyFocusSeconds || 0;
    const goalSeconds = 14400; // 4 Hours
    return Math.min((dailySeconds / goalSeconds) * 100, 100);
  });

  /**
   * 🚀 مزامنة بيانات الهوية عند الإقلاع
   */
  async ngOnInit() {
    this.loading.set(true);
    try {
      const session = this.authService.session();
      const userId = session?.user?.id;

      if (userId) {
        // نطلب تحديث بيانات البروفايل والـ Streak في وقت واحد لسرعة البرق
        await Promise.all([
          this.authService.refreshUserProfile(session),
          this.journeyStore.fetchStreak(userId),
        ]);

        this.newName = this.authService.currentUser()?.name || '';
      }
    } catch (err) {
      console.error('Profile Load Error:', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 🛠️ تفعيل وضع التعديل
   */
  startEdit() {
    this.newName = this.authService.currentUser()?.name || '';
    this.editMode.set(true);
  }

  /**
   * 💾 حفظ التغييرات وتحديث الهوية (Optimistic Update)
   */
  async updateProfile() {
    const nameToSave = this.newName.trim();
    if (nameToSave.length < 3) {
      this.notify.show('Name is too short (min 3 chars).', 'error');
      return;
    }

    this.loading.set(true);
    try {
      const user = this.authService.currentUser();
      if (!user) return;

      // 1. تحديث قاعدة البيانات (Profiles Table)
      const { error: dbError } = await this.supabase
        .from('profiles')
        .update({ name: nameToSave })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // 2. تحديث بيانات الـ Authentication لضمان المزامنة
      await this.supabase.auth.updateUser({ data: { full_name: nameToSave } });

      // 3. التحديث اللحظي للـ Signals (Optimistic UI)
      this.authService.updateCurrentUser({ name: nameToSave });

      this.notify.show('Profile updated successfully.', 'success');
      this.editMode.set(false);
    } catch (err) {
      this.notify.show('Failed to update identity.', 'error');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * تنسيق الوقت لعرض الساعات والدقائق
   */
  formatTime(seconds: number): string {
    if (!seconds || seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  /**
   * استخراج الحرف الأول للأفاتار في حال غياب الصورة
   */
  getUserInitial(name: string | undefined): string {
    return name?.trim().charAt(0).toUpperCase() || 'S';
  }
}