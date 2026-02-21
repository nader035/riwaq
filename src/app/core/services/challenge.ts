/* - Riwaq Mission Control v6.0: High-Performance Engine */
import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth';

// --- Interfaces ---
export interface CatalogItem {
  id: string;
  slug: string;
  name: string;
  total_days: number;
  description: string;
  icon: string;
}

export interface UserQuest {
  id: string;
  main_goal: string;
  current_day: number;
  status: 'active' | 'completed' | 'archived';
  started_at: string;
  catalog_id: string;
  challenges_catalog?: CatalogItem;
}

@Injectable({
  providedIn: 'root',
})
export class ChallengeService {
  private supabase: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
  );

  private router = inject(Router);
  private auth = inject(AuthService);

  // --- Signals (The Reactive Core) ---
  public catalog = signal<CatalogItem[]>([]);
  public activeQuests = signal<UserQuest[]>([]);
  public dailyLogs = signal<any[]>([]);
  public isLoading = signal<boolean>(false);

  // 🛡️ الحد الأقصى للتحديات النشطة
  public canStartNewQuest = computed(() => this.activeQuests().length < 3);

  /**
   * 1. الحارس الذكي: إنشاء سجل اليوم (Lazy Initialization)
   */
  async ensureDayExists(questId: string, dayNumber: number) {
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

  /**
   * 2. جلب كتالوج التحديات
   */
  async fetchCatalog() {
    const { data, error } = await this.supabase
      .from('challenges_catalog')
      .select('*')
      .order('total_days', { ascending: true });

    if (!error && data) this.catalog.set(data);
  }

  /**
   * 3. جلب التحديات النشطة (Optimized with Indexing Support)
   */
  async fetchUserActiveQuests(userId: string) {
    this.isLoading.set(true);
    const { data, error } = await this.supabase
      .from('user_quests')
      .select('*, challenges_catalog(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (!error && data) this.activeQuests.set(data);
    this.isLoading.set(false);
    return data;
  }

  /**
   * 4. بدء تحدي جديد
   */
  async startQuest(userId: string, catalogItem: CatalogItem, goal: string) {
    if (!this.canStartNewQuest()) throw new Error('Slots Full');

    this.isLoading.set(true);

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
      this.isLoading.set(false);
      throw qError;
    }

    await this.ensureDayExists(quest.id, 1);

    this.activeQuests.update((prev) => [quest, ...prev]);
    this.router.navigate(['/app/challenges/quest', quest.id]);
    this.isLoading.set(false);
  }

  /**
   * 5. تحميل تفاصيل التحدي (Net Focus Calculation)
   */
  async loadQuestDetails(questId: string, userId: string) {
    this.isLoading.set(true);

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

    let quest = this.activeQuests().find((q) => q.id === questId);

    if (!quest) {
      const { data: qData } = await this.supabase
        .from('user_quests')
        .select('*, challenges_catalog(*)')
        .eq('id', questId)
        .single();
      quest = qData;
    }

    if (logs && quest) {
      const enrichedLogs = logs.map((log, index) => {
        if (log.is_completed) return log;

        if (log.day_number === quest?.current_day) {
          const previousLog = logs[index - 1];
          const offset = previousLog?.snapshot_focus_at_seal || 0;
          const actualFocus = (profile?.daily_focus_seconds || 0) - offset;
          return { ...log, total_focus_seconds: Math.max(0, actualFocus) };
        }
        return log;
      });
      this.dailyLogs.set(enrichedLogs);
    }

    this.isLoading.set(false);
  }

  /**
   * 6. تحديث المهام (Optimistic Update)
   */
  async updateTasks(logId: string, tasks: any[]) {
    // ⚡ تحديث محلي فوري للأداء
    this.dailyLogs.update((logs) =>
      logs.map((l) => (l.id === logId ? { ...l, tasks } : l))
    );

    // 📡 المزامنة في الخلفية
    const { error } = await this.supabase
      .from('daily_logs')
      .update({ tasks })
      .eq('id', logId);

    if (error) console.error('Failed to sync tasks');
  }

  /**
   * 7. تحديث هدف اليوم (Optimistic Update)
   */
  async updateDailyObjective(logId: string, objective: string) {
    // ⚡ تحديث محلي فوري
    this.dailyLogs.update((logs) =>
      logs.map((l) =>
        l.id === logId ? { ...l, daily_objective: objective } : l
      )
    );

    const { error } = await this.supabase
      .from('daily_logs')
      .update({ daily_objective: objective })
      .eq('id', logId);

    if (error) console.error('Failed to sync objective');
  }

  /**
   * 8. إنهاء اليوم (Complete Day)
   */
  async sealDay(logId: string, quest_id: string, nextDay: number): Promise<boolean> {
    const user = this.auth.currentUser();
    if (!user) return false;

    const quest = this.activeQuests().find((q) => q.id === quest_id);
    const totalDays = quest?.challenges_catalog?.total_days || 14;

    const dayToSave = nextDay > totalDays ? totalDays : nextDay;

    // جلب التايمر الحالي لتثبيته في الـ Snapshot
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('daily_focus_seconds')
      .eq('id', user.id)
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
      if (nextDay <= totalDays) await this.ensureDayExists(quest_id, nextDay);
      await this.loadQuestDetails(quest_id, user.id);
      return true;
    }
    return false;
  }

  /**
   * 9. حذف التحدي نهائياً (Hard Delete)
   */
  async deleteQuestPermanently(questId: string) {
    this.isLoading.set(true);
    try {
      // 1. مسح السجلات اليومية (Cascade Manual)
      await this.supabase.from('daily_logs').delete().eq('quest_id', questId);

      // 2. مسح التحدي
      await this.supabase.from('user_quests').delete().eq('id', questId);

      // 3. تحديث الـ Signals محلياً فوراً لفتح الـ Slot
      this.activeQuests.update((quests) => quests.filter((q) => q.id !== questId));
      this.dailyLogs.set([]);

      this.router.navigate(['/app/challenges']);
    } catch (error) {
      console.error('Hard Delete Failed:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}