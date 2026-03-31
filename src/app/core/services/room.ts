/* - Riwaq Room Engine: High-Fidelity Sync & Ghost-User Fix v4.0 */
import { Injectable, inject, signal, NgZone } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from '../auth/auth';

export interface Room {
  id: string;
  name: string;
  icon: string;
  current_count: number;
  description?: string;
  created_at?: string;
  capacity?: number;
}

@Injectable({ providedIn: 'root' })
export class RoomService {
  // --- Core Injections ---
  private supabase = inject(SupabaseService).supabase;
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);

  // --- Signals (The Reactive UI Source) ---
  public rooms = signal<Room[]>([]);
  public isLoading = signal<boolean>(false);

  constructor() {
    this.initRoomSystem();
    this.setupGhostUserPrevention();
  }

  /**
   * 🏗️ تشغيل محرك الغرف وإحماء المزامنة
   */
  private async initRoomSystem() {
    await this.fetchRooms();
    this.listenToRoomsRealtime();
  }

  private setupGhostUserPrevention() {
    window.addEventListener('beforeunload', () => {
      const user = this.authService.currentUser();
      if (!user) return;

      const supabaseUrl = (this.supabase as any).supabaseUrl;
      const supabaseKey = (this.supabase as any).supabaseKey;

      const storageKey = `sb-tndcfswtpisycfeugqnb-auth-token`;
      const sessionData = localStorage.getItem(storageKey);

      let token = supabaseKey; // Fallback
      if (sessionData) {
        try {
          token = JSON.parse(sessionData).access_token;
        } catch (e) {}
      }

      // 🚀 الضربة القاضية: إرسال الطلب كـ Background Task
      const url = `${supabaseUrl}/rest/v1/room_presence_tracking?user_id=eq.${user.id}`;

      fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${token}`,
        },
        keepalive: true,
      });
    });
  }

  /**
   * 📡 جلب قائمة الغرف الأولية وترتيبها
   */
  async fetchRooms() {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('rooms')
        .select('*')
        .order('current_count', { ascending: false });

      if (error) throw error;
      if (data) {
        this.rooms.set(data as Room[]);
      }
    } catch (error) {
      console.error('RoomService [fetchRooms] Error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * 🚀 الانضمام لغرفة (Tracking Initiation)
   */
  async joinRoom(roomId: string) {
    const user = this.authService.currentUser();
    if (!user) return;

    try {
      const { error } = await this.supabase.from('room_presence_tracking').upsert(
        {
          user_id: user.id,
          room_id: roomId,
          last_ping: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

      if (error) throw error;
    } catch (error) {
      console.error('RoomService [joinRoom] Error:', error);
    }
  }

  /**
   * 🚪 مغادرة الغرفة (Clean Extraction)
   */
  async leaveRoom() {
    const user = this.authService.currentUser();
    if (!user) return;

    try {
      // 👈 السحر هنا: بننادي الدالة اللي عملناها في السيكوال
      const { error } = await this.supabase.rpc('leave_study_room', {
        p_user_id: user.id,
      });

      if (error) throw error;

      console.log('✅ User successfully wiped from room presence.');
    } catch (error) {
      console.error('RoomService [leaveRoom] Error:', error);
    }
  }
  /**
   * ✨ إنشاء غرفة جديدة (Command Override)
   */
  async createRoom(room: Partial<Room>) {
    try {
      const { data, error } = await this.supabase
        .from('rooms')
        .insert([
          {
            name: room.name,
            description: room.description,
            icon: room.icon || 'fa-book',
            capacity: room.capacity || 25,
            current_count: 0,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('RoomService [createRoom] Error:', error);
      return null;
    }
  }

  /**
   * 🔄 محرك المزامنة اللحظي (The Live Matrix)
   * تم تطويره ليعمل على إعادة الترتيب الديناميكي (Dynamic Sorting) عند كل تحديث للعداد
   */
  private listenToRoomsRealtime() {
    this.supabase
      .channel('public:rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        this.ngZone.run(() => {
          const newData = payload.new as Room;
          const oldData = payload.old as Partial<Room>;

          switch (payload.eventType) {
            case 'INSERT':
              this.rooms.update((prev) => {
                const updated = [newData, ...prev];
                // إعادة الترتيب لضمان ظهور الأنشط فوق
                return updated.sort((a, b) => (b.current_count || 0) - (a.current_count || 0));
              });
              break;

            case 'UPDATE':
              this.rooms.update((prev) => {
                const updated = prev.map((r) => (r.id === newData.id ? { ...r, ...newData } : r));
                // 🛡️ السر هنا: إعادة الترتيب فوراً بعد تغيير العداد ليظل الداشبورد حياً
                return updated.sort((a, b) => (b.current_count || 0) - (a.current_count || 0));
              });
              break;

            case 'DELETE':
              this.rooms.update((prev) => prev.filter((r) => r.id !== oldData.id));
              break;
          }
        });
      })
      .subscribe();
  }
}
