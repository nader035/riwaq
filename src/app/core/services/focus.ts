import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class FocusService {
  private supabase = inject(SupabaseService).supabase;

  async saveFocusSession(userId: string, startTime: string, endTime: string): Promise<void> {
    const { error } = await this.supabase.rpc('increment_focus_time_v2', {
      p_user_id: userId,
      p_start_time: startTime,
      p_end_time: endTime,
    });

    if (error) throw error;
  }
}
