/* - Riwaq Room Engine: High-Performance & Real-time v3.1 */
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
  // --- Injections ---
  private supabase = inject(SupabaseService).supabase;
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);

  // --- Signals (The Social Core) ---
  public rooms = signal<Room[]>([]);
  public isLoading = signal<boolean>(false);

  constructor() {
    this.initRoomSystem();
  }

  /**
   * 🏗️ تشغيل محرك الغرف عند بداية التطبيق
   */
  private async initRoomSystem() {
    await this.fetchRooms();
    this.listenToRoomsRealtime();
  }

  /**
   * 📡 جلب قائمة الغرف - مستفيداً من الـ SQL Index لترتيب سريع
   */
  async fetchRooms() {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('rooms')
        .select('*')
        .order('current_count', { ascending: false }); // ترتيب الغرف الأكثر نشاطاً في المقدمة

      if (error) throw error;
      if (data) {
        this.rooms.set(data as Room[]);
      }
    } catch (error) {
      console.error('RoomService [fetchRooms]:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * 🚀 الانضمام لغرفة (Presence Tracking)
   * نقوم بعمل Upsert لضمان وجود سجل واحد فقط لكل مستخدم في تتبع التواجد
   */
  async joinRoom(roomId: string) {
    const user = this.authService.currentUser();
    if (!user) return;

    try {
      // تحديث أو إدراج حالة التواجد
      const { error } = await this.supabase.from('room_presence_tracking').upsert(
        {
          user_id: user.id,
          room_id: roomId,
          last_ping: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (error) throw error;
    } catch (error) {
      console.error('RoomService [joinRoom]:', error);
    }
  }

  /**
   * 🚪 مغادرة الغرفة (Cleanup)
   * مسح سجل المستخدم من جدول التتبع لضمان دقة الإحصائيات
   */
  async leaveRoom() {
    const user = this.authService.currentUser();
    if (!user) return;

    try {
      const { error } = await this.supabase
        .from('room_presence_tracking')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('RoomService [leaveRoom]:', error);
    }
  }

  /**
   * ✨ إنشاء غرفة جديدة (للمشرفين)
   */
  async createRoom(room: Partial<Room>) {
    try {
      const { data, error } = await this.supabase
        .from('rooms')
        .insert([{ 
          name: room.name,
          description: room.description,
          icon: room.icon || 'fa-book',
          capacity: room.capacity || 25,
          current_count: 0 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('RoomService [createRoom]:', error);
      return null;
    }
  }

  /**
   * 🔄 محرك المزامنة اللحظي (PostgreSQL Realtime)
   * هذا المحرك يضمن تحديث الـ Signals فوراً عند حدوث أي تغيير في الداتابيز
   */
  private listenToRoomsRealtime() {
    this.supabase
      .channel('public:rooms')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        (payload) => {
          // استخدام NgZone لضمان أن التحديث يتم داخل "دورة التغيير" لـ Angular
          this.ngZone.run(() => {
            const newData = payload.new as Room;
            const oldData = payload.old as Partial<Room>;

            switch (payload.eventType) {
              case 'INSERT':
                this.rooms.update((prev) => [newData, ...prev]);
                break;

              case 'UPDATE':
                this.rooms.update((prev) =>
                  prev.map((r) => (r.id === newData.id ? { ...r, ...newData } : r))
                );
                break;

              case 'DELETE':
                this.rooms.update((prev) => 
                  prev.filter((r) => r.id !== oldData.id)
                );
                break;
            }
          });
        }
      )
      .subscribe();
  }
}