//
import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';

/**
 * واجهة بيانات البطل (Leader Interface)
 * تم إضافة current_streak لدعم نظام الاستمرارية في القائمة
 */
export interface Leader {
  id: string;
  name: string;
  avatar: string;
  daily_focus_seconds: number;
  current_streak: number; // 🔥 القوة الجديدة
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private supabase = inject(SupabaseService).supabase;

  // الحالات التفاعلية للواجهة
  topScholars = signal<Leader[]>([]);
  loading = signal(false);

  /**
   * 🏆 جلب قائمة الـ Top 10 Scholars لليوم
   * يتم الترتيب تنازلياً حسب ثواني التركيز اليومية
   */
  async fetchDailyTop() {
    this.loading.set(true);

    try {
      // جلب البيانات من جدول البروفايلات مع عمود الستريك الجديد
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id, name, avatar, daily_focus_seconds, current_streak')
        .order('daily_focus_seconds', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        // معالجة البيانات لضمان عدم وجود قيم فارغة (Fallback values)
        const processed: Leader[] = data.map((user) => ({
          id: user.id,
          name: user.name || 'Anonymous Scholar',
          avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          daily_focus_seconds: user.daily_focus_seconds || 0,
          current_streak: user.current_streak || 0, // ضمان ظهور رقم حتى لو 0
        }));

        this.topScholars.set(processed);
      }
    } catch (err) {
      console.error('⚠️ [Sanctuary Error] Hall of Fame fetch failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * (اختياري) جلب البيانات عبر دالة SQL مخزنة (RPC) لزيادة السرعة
   * تأكد أن دالة get_daily_leaderboard في سوبابيز ترجع عمود current_streak
   */
  async fetchViaRPC() {
    const { data, error } = await this.supabase.rpc('get_daily_leaderboard');
    if (!error && data) {
      this.topScholars.set(data);
    } else if (error) {
      console.error('⚠️ [RPC Error]:', error);
    }
  }
}
