import { Injectable, inject, signal, NgZone } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from '../auth/auth'; // تأكد من المسار الصحيح للـ AuthService

export interface Room {
  id: string;
  name: string;
  icon: string;
  current_count: number;
  description?: string;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class RoomService {
  private supabase = inject(SupabaseService).supabase;
  private authService = inject(AuthService); // 👈 حقن AuthService للحصول على معرف المستخدم
  private ngZone = inject(NgZone);

  rooms = signal<Room[]>([]);

  constructor() {
    this.fetchRooms();
    this.listenToRoomsTable();
  }

  /**
   * 📡 جلب قائمة الغرف وترتيبها
   */
  async fetchRooms() {
    const { data, error } = await this.supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) this.rooms.set(data as Room[]);
    if (error) console.error('RoomService [fetchRooms]:', error);
  }

  /**
   * 🚀 الانضمام للغرفة أو إرسال "نبضة" (Ping)
   * يتم استخدام upsert لضمان وجود سجل واحد فقط لكل مستخدم
   */
  //
  async joinRoom(roomId: string) {
    const user = this.authService.currentUser();
    if (!user) {
      return;
    }

    const { error } = await this.supabase.from('room_presence_tracking').upsert(
      {
        user_id: user.id,
        room_id: roomId,
        last_ping: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  }

  /**
   * 🚪 خروج منظم من الغرفة
   */
  async leaveRoom(roomId: string) {
    const user = this.authService.currentUser();
    if (!user) return;

    // حذف سجل التتبع فور خروج المستخدم
    const { error } = await this.supabase
      .from('room_presence_tracking')
      .delete()
      .eq('user_id', user.id);

    if (error) console.error('RoomService [leaveRoom]:', error);
  }

  /**
   * ✨ إنشاء غرفة جديدة
   */
  async createRoom(room: Partial<Room>) {
    const { error } = await this.supabase
      .from('rooms')
      .insert([{ ...room, current_count: 0 }])
      .select();

    return !error;
  }

  /**
   * 🔄 الاستماع للتحديثات اللحظية لجدول الغرف
   * جدول الغرف سيتحدث تلقائياً عبر SQL Trigger عند تغيير جدول الـ Tracking
   */
  private listenToRoomsTable() {
    this.supabase
      .channel('rooms_realtime_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        const newData = payload.new as Room;
        const oldData = payload.old as Partial<Room>;

        this.ngZone.run(() => {
          switch (payload.eventType) {
            case 'INSERT':
              this.rooms.update((prev) => {
                if (prev.some((r) => r.id === newData.id)) return prev;
                return [newData, ...prev];
              });
              break;
            case 'UPDATE':
              this.rooms.update((prev) =>
                prev.map((r) => (r.id === newData.id ? { ...r, ...newData } : r)),
              );
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
