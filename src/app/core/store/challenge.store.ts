import { inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { ChallengeService } from '../services/challenge';
import { CatalogItem, UserQuest } from '../models/challenge';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth';

export interface ChallengeState {
  catalog: CatalogItem[];
  activeQuests: UserQuest[];
  dailyLogs: any[];
  isLoading: boolean;
}

const initialState: ChallengeState = {
  catalog: [],
  activeQuests: [],
  dailyLogs: [],
  isLoading: false,
};

export const ChallengeStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ activeQuests }) => ({
    canStartNewQuest: () => activeQuests().length < 3,
  })),
  withMethods(
    (
      store,
      challengeService = inject(ChallengeService),
      router = inject(Router),
      auth = inject(AuthService),
    ) => ({
      async fetchCatalog() {
        const data = await challengeService.fetchCatalogFromDb();
        if (data) patchState(store, { catalog: data });
      },

      async fetchUserActiveQuests(userId: string) {
        patchState(store, { isLoading: true });
        const data = await challengeService.fetchUserActiveQuestsFromDb(userId);
        if (data) patchState(store, { activeQuests: data });
        patchState(store, { isLoading: false });
        return data;
      },

      async startQuest(userId: string, catalogItem: CatalogItem, goal: string) {
        if (!store.canStartNewQuest()) throw new Error('Slots Full');
        patchState(store, { isLoading: true });

        try {
          const quest = await challengeService.startQuestInDb(userId, catalogItem, goal);
          await challengeService.ensureDayExistsInDb(quest.id, 1);

          patchState(store, (state) => ({ activeQuests: [quest, ...state.activeQuests] }));
          router.navigate(['/app/challenges/quest', quest.id]);
        } finally {
          patchState(store, { isLoading: false });
        }
      },

      async loadQuestDetails(questId: string, userId: string) {
        patchState(store, { isLoading: true });

        let quest = store.activeQuests().find((q) => q.id === questId);
        const result = await challengeService.loadQuestDetailsFromDb(questId, userId, quest);

        if (result.enrichedLogs) {
          patchState(store, { dailyLogs: result.enrichedLogs });
        }
        patchState(store, { isLoading: false });
      },

      async updateTasks(logId: string, tasks: any[]) {
        patchState(store, (state) => ({
          dailyLogs: state.dailyLogs.map((l) => (l.id === logId ? { ...l, tasks } : l)),
        }));
        await challengeService.updateTasksInDb(logId, tasks);
      },

      async updateDailyObjective(logId: string, objective: string) {
        patchState(store, (state) => ({
          dailyLogs: state.dailyLogs.map((l) =>
            l.id === logId ? { ...l, daily_objective: objective } : l
          ),
        }));
        await challengeService.updateDailyObjectiveInDb(logId, objective);
      },

      async sealDay(logId: string, quest_id: string, nextDay: number): Promise<boolean> {
        const user = auth.currentUser();
        if (!user) return false;

        const quest = store.activeQuests().find((q) => q.id === quest_id);
        const totalDays = quest?.challenges_catalog?.total_days || 14;
        const dayToSave = nextDay > totalDays ? totalDays : nextDay;

        patchState(store, { isLoading: true });
        try {
          const success = await challengeService.sealDayInDb(user.id, logId, quest_id, dayToSave, nextDay, totalDays);
          if (success) {
            await this.loadQuestDetails(quest_id, user.id);
            return true;
          }
        } finally {
          patchState(store, { isLoading: false });
        }
        return false;
      },

      async deleteQuestPermanently(questId: string) {
        patchState(store, { isLoading: true });
        try {
          await challengeService.deleteQuestPermanentlyInDb(questId);
          patchState(store, (state) => ({
            activeQuests: state.activeQuests.filter((q) => q.id !== questId),
            dailyLogs: [],
          }));
          router.navigate(['/app/challenges']);
        } catch (error) {
          console.error('Hard Delete Failed:', error);
        } finally {
          patchState(store, { isLoading: false });
        }
      },

      async ensureDayExists(questId: string, dayNumber: number) {
        return await challengeService.ensureDayExistsInDb(questId, dayNumber);
      }
    })
  )
);
