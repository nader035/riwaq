import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { JourneyService } from '../services/journey';
import { withCallState } from './features/with-call-state';

export interface JourneyState {
  currentStreak: number;
  longestStreak: number;
  dailyStats: Record<string, number>;
}

const initialState: JourneyState = {
  currentStreak: 0,
  longestStreak: 0,
  dailyStats: {},
};

export const JourneyStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withCallState(),
  withMethods((store, journeyService = inject(JourneyService)) => ({
    async fetchHistory(userId: string) {
      if (!userId) return;
      store.setLoading();
      try {
        const stats = await journeyService.fetchHistoryFromDb(userId);
        patchState(store, { dailyStats: stats });
        store.setLoaded();
      } catch (err) {
        console.error('JourneyStore [fetchHistory] Error:', err);
        store.setError('Failed to fetch journey history');
      }
    },

    async fetchStreak(userId: string) {
      if (!userId) return;
      try {
        const data = await journeyService.fetchStreakFromDb(userId);
        if (data) {
          patchState(store, {
            currentStreak: data.current_streak || 0,
            longestStreak: data.longest_streak || 0,
          });
        }
      } catch (err) {
        console.error('JourneyStore [fetchStreak] Error:', err);
      }
    },
  }))
);
