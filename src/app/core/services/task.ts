import { Injectable, inject, signal } from '@angular/core';
import { Task } from '../models/task';
import { SupabaseService } from './supabase';
import { NotificationService } from './notification';
import { ConfirmService } from './confirm';
import { ActivityService } from './activity';
import { AuthService } from '../auth/auth'; // مهم جداً لربط المهام باليوزر

@Injectable({ providedIn: 'root' })
export class TaskService {
  private supabase = inject(SupabaseService).supabase;
  private notify = inject(NotificationService);
  private confirmService = inject(ConfirmService);
  private activityService = inject(ActivityService);
  private authService = inject(AuthService);

  // 1. إشارات الحالة (Signals)
  tasks = signal<Task[]>([]);
  loading = signal<boolean>(false);

  /**
   * 📥 جلب المهام من السحابة (Supabase)
   */
  async fetchTasks() {
    const user = this.authService.currentUser();
    if (!user) return;

    this.loading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id) // نضمن جلب مهام المستخدم الحالي فقط
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.tasks.set(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
      this.notify.show('Failed to unroll your scrolls.', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * ➕ إضافة مهمة جديدة للـ Sanctuary
   */
  async addTask(title: string, category: string = 'General', priority: string = 'medium') {
    const user = this.authService.currentUser();
    if (!user || !title.trim()) return;

    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .insert([
          {
            title: title.trim(),
            category,
            priority,
            is_completed: false,
            user_id: user.id, // ربط المهمة بصاحبها
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // تحديث الواجهة فوراً (Optimistic UI)
      this.tasks.update((prev) => [data, ...prev]);
      this.notify.show('Quest added to your journal.', 'success');

      return data;
    } catch (err) {
      this.notify.show('Failed to record quest.', 'error');
      console.error('Insert error:', err);
    }
  }

  /**
   * ✅ تبديل حالة المهمة (إنجاز/تراجع)
   */
  async toggleTask(task: Task) {
    if (!task.id) return;

    const newStatus = !task.is_completed;

    try {
      const { error } = await this.supabase
        .from('tasks')
        .update({ is_completed: newStatus })
        .eq('id', task.id);

      if (error) throw error;

      // تحديث الحالة محلياً
      this.tasks.update((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_completed: newStatus } : t)),
      );

      // سجل النشاط والاحتفال
      if (newStatus) {
        this.notify.show('Great job! Goal achieved.', 'success');
        this.activityService.addActivity('task_completed', `Achieved goal: ${task.title}`);
      }
    } catch (err) {
      this.notify.show('Failed to update task status.', 'error');
      console.error('Update error:', err);
    }
  }

  /**
   * 🗑️ حذف المهمة نهائياً (مع التأكيد)
   */
  async deleteTask(id: string | undefined) {
    if (!id) return;

    // استخدام الـ ConfirmComponent الفخم بتاعنا
    const confirmed = await this.confirmService.ask(
      'This quest will be permanently removed from your archives. Continue?',
    );

    if (confirmed) {
      try {
        const { error } = await this.supabase.from('tasks').delete().eq('id', id);

        if (error) throw error;

        // تنظيف القائمة محلياً
        this.tasks.update((prev) => prev.filter((t) => t.id !== id));
        this.notify.show('Quest removed.', 'info');
      } catch (err) {
        this.notify.show('Failed to remove the scroll.', 'error');
        console.error('Delete error:', err);
      }
    }
  }

  //

  async clearCompletedTasks() {
    const user = this.authService.currentUser();
    if (!user) return;

    try {
      const { error } = await this.supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id)
        .eq('is_completed', true);

      if (error) throw error;

      // تحديث السجنال محلياً لمسح المهام المكتملة فقط
      this.tasks.update((prev) => prev.filter((t) => !t.is_completed));
      this.notify.show('Completed quests have been archived.', 'info');
    } catch (err) {
      console.error('Clear error:', err);
      this.notify.show('Failed to clear completed tasks.', 'error');
    }
  }
}
