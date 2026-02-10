//
import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class JourneyService {
  private supabase = inject(SupabaseService).supabase;
  
  // نستخدم هذه السجنلز لعرض البيانات في الواجهة
  currentStreak = signal<number>(0);
  longestStreak = signal<number>(0);
  dailyStats = signal<Record<string, number>>({});

  /**
   * 📊 جلب سجل المذاكرة التاريخي
   */
  async fetchHistory(userId: string) {
    if (!userId) return;

    const { data, error } = await this.supabase
      .from('daily_focus_summary')
      .select('day, total_seconds')
      .eq('user_id', userId)
      .order('day', { ascending: true });

    if (!error && data) {
      const stats: Record<string, number> = {};
      data.forEach((row) => (stats[row.day] = row.total_seconds));
      this.dailyStats.set(stats);
    }
  }

  /**
   * 🔥 جلب الستريك (الإصلاح: قبول userId كباراميتر)
   */
  async fetchStreak(userId: string) { // 👈 تم إضافة الباراميتر هنا لحل خطأ TS2554
    if (!userId) return;

    const { data, error } = await this.supabase
      .from('profiles')
      .select('current_streak, longest_streak')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching streak:', error);
      return;
    }

    if (data) {
      this.currentStreak.set(data.current_streak || 0);
      this.longestStreak.set(data.longest_streak || 0);
    }
  }
}