//
import { Injectable, inject, signal, NgZone } from '@angular/core';
import { SupabaseService } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'rank';
  title?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private supabase = inject(SupabaseService).supabase;
  private ngZone = inject(NgZone);

  toasts = signal<Toast[]>([]);
  globalMessage = signal<Toast | null>(null);
  private globalChannel: RealtimeChannel;

  constructor() {
    this.globalChannel = this.supabase.channel('riwaq_global_radar');

    this.globalChannel
      .on('broadcast', { event: 'shoutout' }, (payload) => {
        this.ngZone.run(() => {
          console.log('📡 Broadcast Received:', payload);
          this.handleIncomingBroadcast(payload);
        });
      })
      .subscribe((status) => {
        console.log('📡 Channel Status:', status);
      });
  }

  show(message: string, type: 'success' | 'error' | 'info' | 'rank' = 'success', title?: string) {
    const id = Date.now();
    this.toasts.update((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => this.remove(id), 4000);
  }

  async broadcast(title: string, message: string, type: 'info' | 'success' | 'rank' = 'info') {
    await this.globalChannel.send({
      type: 'broadcast',
      event: 'shoutout',
      payload: { title, message, type },
      options: { self: true },
    });
  }

  private handleIncomingBroadcast(payload: any) {
    const data = payload.payload;

    this.globalMessage.set({
      id: Date.now(),
      title: data.title,
      message: data.message,
      type: data.type,
    });

    setTimeout(() => this.globalMessage.set(null), 6000);
  }

  remove(id: number) {
    this.toasts.update((prev) => prev.filter((t) => t.id !== id));
  }
}
