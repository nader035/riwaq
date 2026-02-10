import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private supabase = inject(SupabaseService).supabase;
  activities = signal<any[]>([]);

  constructor() {
    // تشغيل الجلب التلقائي بمجرد بناء السيرفس (اختياري، لكن مفيد)
    this.fetchActivities();
  }

  // إضافة نشاط جديد
  async addActivity(type: 'focus_session' | 'task_completed', message: string, duration?: number) {
    // 1. جلب الـ User ID الحالي (ضروري جداً لـ Supabase RLS)
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    const exp = type === 'focus_session' ? 50 : 20;

    const { error } = await this.supabase.from('activities').insert([
      {
        user_id: user.id, // تأكد إن العمود ده موجود في الجدول
        type,
        message,
        duration_minutes: duration,
        exp_gained: exp,
      },
    ]);

    if (error) {
      console.error('Logging failed:', error.message);
    } else {
      // تحديث القائمة فوراً بعد الإضافة
      this.fetchActivities();
    }
  }

  // جلب الأنشطة
  async fetchActivities() {
    // تأكد إن المستخدم مسجل دخول قبل الطلب
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
      console.error('Error fetching activities:', error.message);
      return;
    }

    if (data) {
      this.activities.set(data);
    }
  }
}
