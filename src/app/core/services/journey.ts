/* - Riwaq Journey Engine: Database Layer */
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class JourneyService {
  private supabase = inject(SupabaseService).supabase;

  async fetchHistoryFromDb(userId: string): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from('daily_focus_summary')
      .select('day, total_seconds')
      .eq('user_id', userId)
      .order('day', { ascending: true });

    if (error) throw error;

    const stats: Record<string, number> = {};
    if (data) {
      data.forEach((row) => {
        const dateKey = String(row.day).substring(0, 10);
        stats[dateKey] = Number(row.total_seconds);
      });
    }
    return stats;
  }

  async fetchStreakFromDb(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('current_streak, longest_streak')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }
}
