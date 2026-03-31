import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { Task } from '../models/task';
import { TaskService } from '../services/task';
import { NotificationService } from '../services/notification';
import { ActivityStore } from '../store/activity.store';
import { withCallState } from './features/with-call-state';

export const TaskStore = signalStore(
  { providedIn: 'root' },
  withState<{ tasks: Task[] }>({ tasks: [] }),
  withCallState(),
  withMethods(
    (
      store,
      taskService = inject(TaskService),
      notify = inject(NotificationService),
      activityStore = inject(ActivityStore)
    ) => {
      return {
        async fetchTasks(): Promise<void> {
          store.setLoading();
          try {
            const data = await taskService.fetchTasksFromDb();
            patchState(store, { tasks: data });
            store.setLoaded();
          } catch (err) {
            console.error('Fetch error:', err);
            notify.show('Failed to unroll your scrolls.', 'error');
            store.setError('Failed to load quests');
          }
        },

        async addTask(title: string, category?: string, priority?: string): Promise<Task | void> {
          const cat = category || 'General';
          const prio = priority || 'medium';
          if (!title.trim()) return;

          try {
            const data = await taskService.addTaskToDb(title, cat, prio);
            patchState(store, (state) => ({ tasks: [data, ...state.tasks] }));
            notify.show('Quest added to your journal.', 'success');
            return data;
          } catch (err) {
            notify.show('Failed to record quest.', 'error');
            console.error('Insert error:', err);
          }
        },

        async toggleTask(task: Task): Promise<void> {
          if (!task.id) return;
          const newStatus = !task.is_completed;

          try {
            await taskService.setTaskStatusInDb(task, newStatus);
            patchState(store, (state) => ({
              tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, is_completed: newStatus } : t)),
            }));

            if (newStatus) {
              notify.show('Great job! Goal achieved.', 'success');
              activityStore.addActivity('task_completed', `Achieved goal: ${task.title}`);
            }
          } catch (err) {
            notify.show('Failed to update task status.', 'error');
            console.error('Update error:', err);
          }
        },

        async deleteTask(id: string | undefined): Promise<void> {
          if (!id) return;

          try {
            const success = await taskService.deleteTaskFromDb(id);
            if (success) {
              patchState(store, (state) => ({
                tasks: state.tasks.filter((t) => t.id !== id),
              }));
              notify.show('Quest removed.', 'info');
            }
          } catch (err) {
            notify.show('Failed to remove the scroll.', 'error');
            console.error('Delete error:', err);
          }
        },

        async clearCompletedTasks(): Promise<void> {
          try {
            await taskService.clearCompletedTasksFromDb();
            patchState(store, (state) => ({
              tasks: state.tasks.filter((t) => !t.is_completed),
            }));
            notify.show('Completed quests have been archived.', 'info');
          } catch (err) {
            console.error('Clear error:', err);
            notify.show('Failed to clear completed tasks.', 'error');
          }
        },
      };
    }
  )
);
