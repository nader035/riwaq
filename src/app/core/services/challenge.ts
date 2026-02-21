/* - Riwaq Mission Control v5.2 (Zero Errors Edition) */
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

  // --- Signals ---
  public catalog = signal<CatalogItem[]>([]);
  public activeQuests = signal<UserQuest[]>([]);
  public dailyLogs = signal<any[]>([]);
  public isLoading = signal<boolean>(false);

  public canStartNewQuest = computed(() => this.activeQuests().length < 3);

  /**
   * 1. الحارس الذكي: إنشاء سجل اليوم عند الحاجة
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
      console.error('Lazy Load Error:', error.message);
      return null;
    }
    return created;
  }

  /**
   * 2. جلب الكتالوج
   */
  async fetchCatalog() {
    const { data, error } = await this.supabase
      .from('challenges_catalog')
      .select('*')
      .order('total_days', { ascending: true });

    if (!error && data) this.catalog.set(data);
  }

  /**
   * 3. جلب التحديات النشطة
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
   * 4. بدء رحلة جديدة
   */
  async startQuest(userId: string, catalogItem: CatalogItem, goal: string) {
    if (!this.canStartNewQuest()) throw new Error('Limit Reached');

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
   * 5. تحميل تفاصيل المحطات (Net Focus Time)
   */
  /* */

  async loadQuestDetails(questId: string, userId: string) {
    this.isLoading.set(true);

    // 1. جلب بيانات البروفايل (التايمر)
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('daily_focus_seconds')
      .eq('id', userId)
      .single();

    // 2. جلب سجلات الأيام
    const { data: logs } = await this.supabase
      .from('daily_logs')
      .select('*')
      .eq('quest_id', questId)
      .order('day_number', { ascending: true });

    // 🚨 فحص ذكي: لو الـ activeQuests فاضية، روح هاتها مخصوص للكويست ده
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
   * 6. تحديث المهام وهدف اليوم
   */
  async updateTasks(logId: string, tasks: any[]) {
    const { error } = await this.supabase.from('daily_logs').update({ tasks }).eq('id', logId);
    if (!error) {
      this.dailyLogs.update((logs) => logs.map((l) => (l.id === logId ? { ...l, tasks } : l)));
    }
  }

  async updateDailyObjective(logId: string, objective: string) {
    const { error } = await this.supabase
      .from('daily_logs')
      .update({ daily_objective: objective })
      .eq('id', logId);
    if (!error) {
      this.dailyLogs.update((logs) =>
        logs.map((l) => (l.id === logId ? { ...l, daily_objective: objective } : l)),
      );
    }
  }

  /**
   * 7. ختم المحطة (Seal Station)
   */
  async sealDay(logId: string, quest_id: string, nextDay: number): Promise<boolean> {
    const user = this.auth.currentUser();
    if (!user) return false;

    const quest = this.activeQuests().find((q) => q.id === quest_id);
    const totalDays = quest?.challenges_catalog?.total_days || 14;

    // 🛡️ لو وصلنا لليوم الأخير، بنثبته مش بنزوده (عشان يفضل ظاهر في الـ Hub)
    const dayToSave = nextDay > totalDays ? totalDays : nextDay;

    const { error: lError } = await this.supabase
      .from('daily_logs')
      .update({ is_completed: true, completed_at: new Date() })
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
   * 8. الأرشفة
   */
  async archiveQuest(questId: string) {
    const { error } = await this.supabase
      .from('user_quests')
      .update({ status: 'archived' })
      .eq('id', questId);

    if (!error) {
      this.activeQuests.update((quests) => quests.filter((q) => q.id !== questId));
      this.router.navigate(['/app/challenges']);
    }
  } /* - Hard Delete Logic */

  async deleteQuestPermanently(questId: string) {
    this.isLoading.set(true);
    try {
      // 1. مسح كل السجلات اليومية المرتبطة بالتحدي أولاً (Foreign Key Requirement)
      const { error: logsError } = await this.supabase
        .from('daily_logs')
        .delete()
        .eq('quest_id', questId);

      if (logsError) throw logsError;

      // 2. مسح التحدي نفسه من جدول user_quests
      const { error: questError } = await this.supabase
        .from('user_quests')
        .delete()
        .eq('id', questId);

      if (questError) throw questError;

      // 3. تحديث الـ Signals محلياً فوراً
      this.activeQuests.update((quests) => quests.filter((q) => q.id !== questId));
      this.dailyLogs.set([]); // تنظيف السجلات المعروضة

      // 4. العودة للـ Hub
      this.router.navigate(['/app/challenges']);
    } catch (error) {
      console.error('Delete Error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
