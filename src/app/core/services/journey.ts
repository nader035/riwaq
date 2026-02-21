/* - Riwaq Journey Engine: Stable Mapping Version */
import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class JourneyService {
  private supabase = inject(SupabaseService).supabase;

  // --- Signals (The Reactive Core) ---
  currentStreak = signal<number>(0);
  longestStreak = signal<number>(0);
  dailyStats = signal<Record<string, number>>({});
  isLoading = signal<boolean>(false);

  /**
   * 📊 جلب سجل المذاكرة التاريخي
   * تم تعديله لضمان تطابق مفاتيح التاريخ (Date Key Matching)
   */
  async fetchHistory(userId: string) {
    if (!userId) return;
    this.isLoading.set(true);

    try {
      const { data, error } = await this.supabase
        .from('daily_focus_summary')
        .select('day, total_seconds')
        .eq('user_id', userId)
        .order('day', { ascending: true });

      if (error) throw error;

      if (data) {
        const stats: Record<string, number> = {};

        data.forEach((row) => {
          /**
           * 🚀 السر هنا:
           * نضمن استخراج أول 10 حروف فقط (YYYY-MM-DD)
           * ده بيحل مشكلة لو الداتا راجعة فيها توقيت أو ISO format
           */
          const dateKey = String(row.day).substring(0, 10);
          stats[dateKey] = Number(row.total_seconds);
        });

        // تحديث الـ Signal دفعة واحدة
        this.dailyStats.set(stats);
      }
    } catch (err) {
      console.error('❌ JourneyService Error:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * 🔥 جلب الستريك
   */
  async fetchStreak(userId: string) {
    if (!userId) return;

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('current_streak, longest_streak')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        this.currentStreak.set(data.current_streak || 0);
        this.longestStreak.set(data.longest_streak || 0);
      }
    } catch (err) {
      console.error('❌ Streak Fetch Error:', err);
    }
  }
}
