/* - Riwaq Core: High-Precision Focus Engine v4.8 */
import { computed, Injectable, signal, inject, effect } from '@angular/core';
import { NotificationService } from './notification';
import { SupabaseService } from './supabase';
import { AuthService } from '../auth/auth';

@Injectable({ providedIn: 'root' })
export class Focus {
  private notify = inject(NotificationService);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService).supabase;

  // 🚦 إشارات الحالة (The Reactive Core)
  elapsedSeconds = signal<number>(0);
  isActive = signal<boolean>(false);
  timerStatus = signal<'idle' | 'focusing' | 'break'>('idle');

  // 🚪 تتبع الغرفة (Room Identity)
  currentRoomId = signal<string | null>(null);
  currentRoomName = signal<string | null>(null);

  // ⏱️ تتبع وقت البداية لضمان الدقة ضد تهنيج المتصفح
  private startTime = signal<string | null>(null);
  private intervalId: any;

  // 💾 مفاتيح الذاكرة (Local Storage Vault)
  private readonly STORAGE_KEY = 'riwaq_timer_backup';
  private readonly START_TIME_KEY = 'riwaq_start_time_backup';
  private readonly ROOM_ID_KEY = 'riwaq_room_id_backup';
  private readonly ROOM_NAME_KEY = 'riwaq_room_name_backup';

  constructor() {
    this.restoreState();

    // 🔄 الحفظ التلقائي (Auto-save daemon)
    effect(() => {
      const s = this.elapsedSeconds();
      const start = this.startTime();
      const rid = this.currentRoomId();
      const rname = this.currentRoomName();

      if (s > 0) localStorage.setItem(this.STORAGE_KEY, s.toString());
      if (start) localStorage.setItem(this.START_TIME_KEY, start);
      if (rid) localStorage.setItem(this.ROOM_ID_KEY, rid);
      if (rname) localStorage.setItem(this.ROOM_NAME_KEY, rname);
    });
  }

  /**
   * 📺 تنسيق الوقت (The 60-Minute Fix)
   * تم حل مشكلة عدم عرض الساعة بشكل صحيح
   */
  formattedTime = computed(() => {
    const s = this.elapsedSeconds();

    // حسبة رياضية دقيقة تفصل الساعات عن الدقائق عن الثواني
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    // عرض الساعات دائماً إذا تجاوز الوقت 59 دقيقة
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  });

  /**
   * 💾 حفظ الجلسة في قاعدة البيانات (Atomic Transaction)
   */
  async saveProgress(seconds: number) {
    const user = this.authService.currentUser();
    const start = this.startTime();
    const end = new Date().toISOString();

    if (!user || seconds <= 0 || !start) return;

    try {
      const { error } = await this.supabase.rpc('increment_focus_time_v2', {
        p_user_id: user.id,
        p_start_time: start,
        p_end_time: end,
      });

      if (error) throw error;

      this.notify.show('Session archived in the sanctuary.', 'success');
      this.reset();
    } catch (err) {
      console.error('Save error:', err);
      this.notify.show('Sync failed. Progress kept locally.', 'error');
    }
  }

  // --- ⏱️ التحكم في المحرك (Engine Controls) ---

  startTimer() {
    if (this.isActive() && this.timerStatus() === 'focusing') return;

    if (!this.startTime()) {
      this.startTime.set(new Date().toISOString());
    }

    this.stopInterval();
    this.isActive.set(true);
    this.timerStatus.set('focusing');

    this.intervalId = setInterval(() => {
      this.elapsedSeconds.update((s) => s + 1);
    }, 1000);
  }

  pauseTimer() {
    this.stopInterval();
    this.isActive.set(false);
    this.timerStatus.set('break');
  }

  reset() {
    this.stopInterval();
    this.elapsedSeconds.set(0);
    this.timerStatus.set('idle');
    this.isActive.set(false);
    this.startTime.set(null);

    this.currentRoomId.set(null);
    this.currentRoomName.set(null);

    this.clearStorage();
  }

  setRoom(roomId: string | null, roomName: string | null) {
    this.currentRoomId.set(roomId);
    this.currentRoomName.set(roomName);
  }

  totalSeconds(): number {
    return this.elapsedSeconds();
  }

  getRawStartTime(): string | null {
    return this.startTime();
  }

  // --- 🛠️ دوال النظام الخاصة (Internal Methods) ---

  private restoreState() {
    const savedSeconds = localStorage.getItem(this.STORAGE_KEY);
    const savedStartTime = localStorage.getItem(this.START_TIME_KEY);
    const savedRoomId = localStorage.getItem(this.ROOM_ID_KEY);
    const savedRoomName = localStorage.getItem(this.ROOM_NAME_KEY);

    if (savedSeconds) this.elapsedSeconds.set(parseInt(savedSeconds, 10));
    if (savedStartTime) this.startTime.set(savedStartTime);
    if (savedRoomId) this.currentRoomId.set(savedRoomId);
    if (savedRoomName) this.currentRoomName.set(savedRoomName);
  }

  private clearStorage() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.START_TIME_KEY);
    localStorage.removeItem(this.ROOM_ID_KEY);
    localStorage.removeItem(this.ROOM_NAME_KEY);
  }

  private stopInterval() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
