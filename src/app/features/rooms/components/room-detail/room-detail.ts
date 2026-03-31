/* - Riwaq Room Engine: Fixed Avatar Logic & Performance v3.1 */
import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  effect,
  untracked,
  NgZone,
  computed,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';

import { AuthService } from '../../../../core/auth/auth';
import { FocusStore } from '../../../../core/store/focus.store';
import { SupabaseService } from '../../../../core/services/supabase';
import { RoomStore } from '../../../../core/store/room.store';
import { NotificationService } from '../../../../core/services/notification';

@Component({
  selector: 'app-room-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './room-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush, // 🔥 أداء عالي جداً
})
export class RoomDetailComponent implements OnInit, OnDestroy {
  // --- Injections ---
  protected focus = inject(FocusStore);
  protected authService = inject(AuthService);
  protected roomStore = inject(RoomStore);
  protected notify = inject(NotificationService);
  private supabase = inject(SupabaseService).supabase;
  private route = inject(ActivatedRoute);
  private ngZone = inject(NgZone);

  // --- Signals ---
  private presenceState = signal<any>({});
  private currentRoomId: string | null = null;
  roomIcon = signal<string>('fa-door-open');
  showSummary = signal(false);
  sessionSummary = signal({ duration: '', hoursEarned: 0, intensity: 0, message: '' });

  private now = signal(Date.now());
  private clockIntervalId: any;
  private broadcastIntervalId: any;
  private syncIntervalId: any;
  private roomChannel?: RealtimeChannel;

  @HostListener('window:beforeunload')
  async onBeforeUnload() {
    if (this.currentRoomId) await this.roomStore.leaveRoom();
  }

  /**
   * 🚀 الـ Scholars النشطون: حساب متزامن لكل المستخدمين
   */
  activeScholars = computed(() => {
    const state = this.presenceState();
    const myId = this.authService.currentUser()?.id;
    const currentTick = this.now();

    return Object.keys(state).map((key) => {
      const scholar = { ...state[key][0] };

      if (scholar.id === myId) {
        scholar.status = this.focus.timerStatus();
        scholar.time = this.focus.formattedTime();
      } else if (scholar.status === 'focusing' && scholar.last_updated_at) {
        scholar.time = this.calculateSyncedTime(
          scholar.offset_seconds || 0,
          scholar.last_updated_at,
          currentTick,
        );
      } else if (scholar.status === 'break') {
        const totalSecs = scholar.offset_seconds || 0;
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        scholar.time = hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
      } else {
        scholar.time = scholar.time || '00:00';
      }
      return scholar;
    });
  });

  constructor() {
    effect(() => {
      this.focus.timerStatus();
      untracked(() => {
        if (this.roomChannel) this.syncMyStatus();
      });
    });
  }

  async ngOnInit() {
    this.currentRoomId = this.route.snapshot.paramMap.get('id');
    if (this.currentRoomId) {
      await this.loadRoomDetails(this.currentRoomId);
      await this.roomStore.joinRoom(this.currentRoomId);
      this.setupRealtime(this.currentRoomId);

      this.clockIntervalId = setInterval(() => {
        this.ngZone.run(() => this.now.set(Date.now()));
      }, 1000);

      this.broadcastIntervalId = setInterval(() => this.syncMyStatus(), 10000);
      this.syncIntervalId = setInterval(() => {
        if (this.currentRoomId) this.roomStore.joinRoom(this.currentRoomId);
      }, 30000);
    }
  }

  /**
   * ✅ حل المشكلة: معالجة خطأ تحميل الأفاتار
   */
  handleAvatarError(event: any) {
    const img = event.target as HTMLImageElement;
    // نخفي الصورة المكسورة فوراً
    img.style.display = 'none';

    // نبحث عن الـ Fallback اللي جنبها ونظهره
    const container = img.closest('.relative');
    const fallback = container?.querySelector('.avatar-fallback');
    if (fallback) {
      fallback.classList.remove('hidden');
    }
  }

  private setupRealtime(roomId: string) {
    const user = this.authService.currentUser();
    if (!user) return;

    this.roomChannel = this.supabase.channel(`room_${roomId}`, {
      config: { presence: { key: user.id } },
    });

    this.roomChannel
      .on('presence', { event: 'sync' }, () => {
        this.ngZone.run(() => {
          this.presenceState.set(this.roomChannel?.presenceState() || {});
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await this.syncMyStatus();
      });
  }

  private async syncMyStatus() {
    const user = this.authService.currentUser();
    if (this.roomChannel && this.roomChannel.state === 'joined' && user) {
      await this.roomChannel.track({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        status: this.focus.timerStatus(),
        offset_seconds: this.focus.totalSeconds(),
        last_updated_at: new Date().toISOString(),
        nonce: Math.random(),
      });
    }
  }

  private calculateSyncedTime(offset: number, lastUpdateIso: string, nowMs: number): string {
    const lastUpdate = new Date(lastUpdateIso).getTime();
    const drift = Math.floor((nowMs - lastUpdate) / 1000);
    const totalSecs = Math.max(0, offset + drift);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  }

  async loadRoomDetails(roomId: string) {
    const { data } = await this.supabase
      .from('rooms')
      .select('name, icon')
      .eq('id', roomId)
      .single();
    if (data) {
      this.focus.setRoom(roomId, data.name);
      this.roomIcon.set(data.icon);
    }
  }

  handleStart() {
    this.focus.startTimer();
  }
  handleBreak() {
    this.focus.pauseTimer();
  }

  async handleFinish() {
    const seconds = this.focus.totalSeconds();
    if (seconds < 10) {
      this.notify.show('Session too short.', 'info');
      this.focus.reset();
      return;
    }
    this.sessionSummary.set({
      duration: this.focus.formattedTime(),
      hoursEarned: Number((seconds / 3600).toFixed(2)),
      intensity: 3,
      message: 'Focus archived in the vaults.',
    });
    await this.focus.saveProgress(seconds);
    this.showSummary.set(true);
    this.focus.reset();
  }

  async ngOnDestroy() {
    if (this.currentRoomId) await this.roomStore.leaveRoom();
    [this.syncIntervalId, this.clockIntervalId, this.broadcastIntervalId].forEach(clearInterval);
    if (this.roomChannel) this.roomChannel.unsubscribe();
  }
}
