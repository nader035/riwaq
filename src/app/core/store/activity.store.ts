import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withHooks } from '@ngrx/signals';
import { ActivityService } from '../services/activity';

export interface ActivityState {
  activities: any[];
}

const initialState: ActivityState = {
  activities: [],
};

export const ActivityStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, activityService = inject(ActivityService)) => ({
    async fetchActivities() {
      const data = await activityService.fetchActivitiesFromDb();
      if (data) patchState(store, { activities: data });
    },
    async addActivity(type: 'focus_session' | 'task_completed', message: string, duration?: number) {
      await activityService.addActivityToDb(type, message, duration);
      await this.fetchActivities();
    }
  })),
  withHooks({
    onInit(store) {
      store.fetchActivities();
    }
  })
);
