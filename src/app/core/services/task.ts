import { inject, Injectable } from '@angular/core';
import { Task } from '../models/task';
import { SupabaseService } from './supabase';
import { ConfirmService } from './confirm';
import { AuthService } from '../auth/auth';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private supabase = inject(SupabaseService).supabase;
  private confirmService = inject(ConfirmService);
  private authService = inject(AuthService);

  async fetchTasksFromDb(): Promise<Task[]> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('Unauthenticated');

    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Task[];
  }

  async addTaskToDb(title: string, category: string = 'General', priority: string = 'medium'): Promise<Task> {
    const user = this.authService.currentUser();
    if (!user || !title.trim()) throw new Error('Missing User or Title');

    const { data, error } = await this.supabase
      .from('tasks')
      .insert([
        {
          title: title.trim(),
          category,
          priority,
          is_completed: false,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  }

  async setTaskStatusInDb(task: Task, isCompleted: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('tasks')
      .update({ is_completed: isCompleted })
      .eq('id', task.id);

    if (error) throw error;
  }

  async deleteTaskFromDb(id: string): Promise<boolean> {
    const confirmed = await this.confirmService.ask(
      'This quest will be permanently removed from your archives. Continue?'
    );

    if (!confirmed) return false;

    const { error } = await this.supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async clearCompletedTasksFromDb(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    const { error } = await this.supabase
      .from('tasks')
      .delete()
      .eq('user_id', user.id)
      .eq('is_completed', true);

    if (error) throw error;
  }
}
