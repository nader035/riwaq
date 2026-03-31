import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private supabase = inject(SupabaseService).supabase;

  async addActivityToDb(type: 'focus_session' | 'task_completed', message: string, duration?: number) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      console.warn('Unauthorized activity logging attempted.');
      return;
    }

    const { error } = await this.supabase.from('activities').insert([
      {
        user_id: user.id,
        type,
        message,
        duration_minutes: duration || 0
      },
    ]);

    if (error) {
      console.error('Archive Logging failed:', error.message);
    }
  }

  async fetchActivitiesFromDb() {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (!session) return;

    const { data, error } = await this.supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error retrieving archives:', error.message);
      return;
    }

    return data;
  }
}