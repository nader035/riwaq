import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { Leader } from '../models/leaderboard';

export type { Leader } from '../models/leaderboard';

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private supabase = inject(SupabaseService).supabase;

  async fetchDailyTopFromDb(): Promise<Leader[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, name, avatar, daily_focus_seconds, current_streak')
      .order('daily_focus_seconds', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (data) {
      return data.map((user) => ({
        id: user.id,
        name: user.name || 'Anonymous Scholar',
        avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        daily_focus_seconds: user.daily_focus_seconds || 0,
        current_streak: user.current_streak || 0,
      }));
    }
    return [];
  }

  async fetchViaRPCFromDb(): Promise<Leader[]> {
    const { data, error } = await this.supabase.rpc('get_daily_leaderboard');
    if (error) throw error;
    return data;
  }
}
