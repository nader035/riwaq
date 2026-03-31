/* - Riwaq Mission Control v6.0: Database Layer */
import { Injectable, inject } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { CatalogItem, UserQuest } from '../models/challenge';

export type { CatalogItem, UserQuest } from '../models/challenge';

@Injectable({
  providedIn: 'root',
})
export class ChallengeService {
  private supabase: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
  );

  async ensureDayExistsInDb(questId: string, dayNumber: number) {
    const { data: existing } = await this.supabase
      .from('daily_logs')
      .select('*')
      .eq('quest_id', questId)
      .eq('day_number', dayNumber)
      .maybeSingle();

    if (existing) return existing;

    const { data: created, error } = await this.supabase
      .from('daily_logs')
      .insert([
        {
          quest_id: questId,
          day_number: dayNumber,
          tasks: [],
          daily_objective: '',
          is_completed: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Day Creation Error:', error.message);
      return null;
    }
    return created;
  }

  async fetchCatalogFromDb() {
    const { data, error } = await this.supabase
      .from('challenges_catalog')
      .select('*')
      .order('total_days', { ascending: true });

    if (!error && data) return data as CatalogItem[];
    return [];
  }

  async fetchUserActiveQuestsFromDb(userId: string) {
    const { data, error } = await this.supabase
      .from('user_quests')
      .select('*, challenges_catalog(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (!error && data) return data as UserQuest[];
    return [];
  }

  async startQuestInDb(userId: string, catalogItem: CatalogItem, goal: string) {
    const { data: quest, error: qError } = await this.supabase
      .from('user_quests')
      .insert([
        {
          user_id: userId,
          catalog_id: catalogItem.id,
          main_goal: goal,
          status: 'active',
          current_day: 1,
        },
      ])
      .select('*, challenges_catalog(*)')
      .single();

    if (qError) {
      throw qError;
    }
    return quest as UserQuest;
  }

  async loadQuestDetailsFromDb(questId: string, userId: string, activeQuest: UserQuest | undefined) {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('daily_focus_seconds')
      .eq('id', userId)
      .single();

    const { data: logs } = await this.supabase
      .from('daily_logs')
      .select('*')
      .eq('quest_id', questId)
      .order('day_number', { ascending: true });

    let quest = activeQuest;
    if (!quest) {
      const { data: qData } = await this.supabase
        .from('user_quests')
        .select('*, challenges_catalog(*)')
        .eq('id', questId)
        .single();
      quest = qData;
    }

    let enrichedLogs: any[] = [];
    if (logs && quest) {
      enrichedLogs = logs.map((log, index) => {
        if (log.is_completed) return log;

        if (log.day_number === quest?.current_day) {
          const previousLog = logs[index - 1];
          const offset = previousLog?.snapshot_focus_at_seal || 0;
          const actualFocus = (profile?.daily_focus_seconds || 0) - offset;
          return { ...log, total_focus_seconds: Math.max(0, actualFocus) };
        }
        return log;
      });
    }

    return { quest, enrichedLogs };
  }

  async updateTasksInDb(logId: string, tasks: any[]) {
    const { error } = await this.supabase
      .from('daily_logs')
      .update({ tasks })
      .eq('id', logId);

    if (error) console.error('Failed to sync tasks');
  }

  async updateDailyObjectiveInDb(logId: string, objective: string) {
    const { error } = await this.supabase
      .from('daily_logs')
      .update({ daily_objective: objective })
      .eq('id', logId);

    if (error) console.error('Failed to sync objective');
  }

  async sealDayInDb(userId: string, logId: string, quest_id: string, dayToSave: number, nextDay: number, totalDays: number): Promise<boolean> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('daily_focus_seconds')
      .eq('id', userId)
      .single();

    const { error: lError } = await this.supabase
      .from('daily_logs')
      .update({ 
        is_completed: true, 
        completed_at: new Date(),
        snapshot_focus_at_seal: profile?.daily_focus_seconds || 0
      })
      .eq('id', logId);

    const { error: qError } = await this.supabase
      .from('user_quests')
      .update({ current_day: dayToSave })
      .eq('id', quest_id);

    if (!lError && !qError) {
      if (nextDay <= totalDays) await this.ensureDayExistsInDb(quest_id, nextDay);
      return true;
    }
    return false;
  }

  async deleteQuestPermanentlyInDb(questId: string) {
    await this.supabase.from('daily_logs').delete().eq('quest_id', questId);
    await this.supabase.from('user_quests').delete().eq('id', questId);
  }
}