import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// الخدمات
import { TaskStore } from '../../core/store/task.store';
import { NotificationService } from '../../core/services/notification';
import { ConfirmService } from '../../core/services/confirm';

import { SkeletonComponent } from '../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './tasks.html',
})
export class TasksComponent implements OnInit {
  protected taskStore = inject(TaskStore);
  private confirmService = inject(ConfirmService);
  private notify = inject(NotificationService);

  isModalOpen = signal(false);
  selectedCategory = signal('All');
  filterStatus = signal<'all' | 'todo' | 'done'>('all');
  readonly statusOptions: ('all' | 'todo' | 'done')[] = ['all', 'todo', 'done'];
  newTask = signal({
    title: '',
    category: 'Study',
    priority: 'medium',
  });

  categories = ['All', 'Work', 'Study', 'Personal'];

  ngOnInit() {
    // جلب المهام فور تحميل المكون
    this.taskStore.fetchTasks();
  }

  /**
   * 🧠 الفلترة الذكية (Computed):
   * تعمل تلقائياً بمجرد تغير الـ selectedCategory أو الـ filterStatus
   */
  filteredTasks = computed(() => {
    const allTasks = this.taskStore.tasks();
    return allTasks.filter((task) => {
      const matchCat =
        this.selectedCategory() === 'All' || task.category === this.selectedCategory();
      const matchStatus =
        this.filterStatus() === 'all' ||
        (this.filterStatus() === 'todo' && !task.is_completed) ||
        (this.filterStatus() === 'done' && task.is_completed);
      return matchCat && matchStatus;
    });
  });

  /**
   * 📊 إحصائيات الإنجاز السريع
   */
  stats = computed(() => {
    const all = this.taskStore.tasks();
    return {
      total: all.length,
      done: all.filter((t) => t.is_completed).length,
      todo: all.filter((t) => !t.is_completed).length,
      percent:
        all.length > 0
          ? Math.round((all.filter((t) => t.is_completed).length / all.length) * 100)
          : 0,
    };
  });

  // --- 🛠️ إدارة العمليات ---

  toggleModal() {
    this.isModalOpen.update((v) => !v);
    if (!this.isModalOpen()) this.resetForm();
  }

  resetForm() {
    this.newTask.set({ title: '', category: 'Study', priority: 'medium' });
  }

  /**
   * 💾 حفظ المهمة في السحابة
   */
  async saveTask() {
    const data = this.newTask();
    if (!data.title.trim()) {
      this.notify.show('A quest needs a name, Scholar.', 'info');
      return;
    }

    try {
      await this.taskStore.addTask(data.title, data.category, data.priority);
      this.toggleModal();
      // التنبيه يظهر من داخل الخدمة الآن لتوحيد الـ UX
    } catch (error) {
      this.notify.show('The scrolls are heavy today. Could not save.', 'error');
    }
  }

  /**
   * 🗑️ حذف المهمة
   * ملاحظة: تم تبسيط الكود هنا لأن الـ TaskStore يحتوي بالفعل على الـ Confirm Logic
   */
  async deleteTask(id: string | undefined) {
    if (!id) return;

    // ننادي دالة الحذف في الخدمة مباشرة؛ الخدمة هي من ستسأل المستخدم للتأكيد
    await this.taskStore.deleteTask(id);
  }

  /**
   * ✅ تحديث الحالة (Toggle)
   */
  async onToggle(task: any) {
    await this.taskStore.toggleTask(task);
  }

  async onClearCompleted() {
    const doneCount = this.stats().done;
    if (doneCount === 0) return;

    const confirmed = await this.confirmService.ask(
      `You are about to remove ${doneCount} completed quests forever. Are you sure?`,
    );

    if (confirmed) {
      await this.taskStore.clearCompletedTasks();
    }
  }
}
