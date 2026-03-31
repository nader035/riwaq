import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { LeaderboardService } from '../services/leaderboard';
import { Leader } from '../models/leaderboard';

export interface LeaderboardState {
  topScholars: Leader[];
  isLoading: boolean;
}

const initialState: LeaderboardState = {
  topScholars: [],
  isLoading: false,
};

export const LeaderboardStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, leaderboardService = inject(LeaderboardService)) => ({
    async fetchDailyTop() {
      patchState(store, { isLoading: true });
      try {
        const data = await leaderboardService.fetchDailyTopFromDb();
        if (data) patchState(store, { topScholars: data });
      } catch (err) {
        console.error('Leaderboard fetch failed', err);
      } finally {
        patchState(store, { isLoading: false });
      }
    },
    async fetchViaRPC() {
      try {
        const data = await leaderboardService.fetchViaRPCFromDb();
        if (data) patchState(store, { topScholars: data });
      } catch(err) {
        console.error('RPC Error:', err);
      }
    }
  }))
);
