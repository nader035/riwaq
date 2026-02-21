import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private supabase = inject(SupabaseService).supabase;
  
  // سجل الأنشطة (Signals) لتحديث الواجهة تلقائياً
  activities = signal<any[]>([]);

  constructor() {
    // جلب الأنشطة عند بدء تشغيل السيرفس
    this.fetchActivities();
  }

  /**
   * إضافة نشاط جديد لجدول الأنشطة
   * @param type نوع النشاط (جلسة تركيز أو مهمة مكتملة)
   * @param message الرسالة الوصفية للنشاط
   * @param duration مدة النشاط بالدقائق (اختياري)
   */
  async addActivity(type: 'focus_session' | 'task_completed', message: string, duration?: number) {
    // 1. جلب بيانات المستخدم الحالي لربط النشاط بحسابه
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      console.warn('Unauthorized activity logging attempted.');
      return;
    }

    // 2. إدخال البيانات للجدول (تم مسح exp_gained لضمان استقرار الطلب)
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
    } else {
      // 3. تحديث القائمة فوراً لتعكس النشاط الجديد في الواجهة
      await this.fetchActivities();
    }
  }

  /**
   * جلب آخر 10 أنشطة خاصة بالمستخدم الحالي
   */
  async fetchActivities() {
    // التحقق من وجود جلسة نشطة قبل الطلب لضمان الخصوصية (RLS)
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

    if (data) {
      this.activities.set(data);
    }
  }
}