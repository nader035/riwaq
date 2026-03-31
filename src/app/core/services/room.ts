import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from '../auth/auth';
import { Room } from '../models/room';

@Injectable({ providedIn: 'root' })
export class RoomService {
  private supabase = inject(SupabaseService).supabase;
  private authService = inject(AuthService);

  async fetchRoomsFromDb(): Promise<Room[]> {
    const { data, error } = await this.supabase
      .from('rooms')
      .select('*')
      .order('current_count', { ascending: false });

    if (error) throw error;
    return data as Room[];
  }

  async joinRoomInDb(roomId: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    const { error } = await this.supabase.from('room_presence_tracking').upsert(
      {
        user_id: user.id,
        room_id: roomId,
        last_ping: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) throw error;
  }

  async leaveRoomFromDb(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    const { error } = await this.supabase.rpc('leave_study_room', {
      p_user_id: user.id,
    });

    if (error) throw error;
    console.log('✅ User successfully wiped from room presence.');
  }

  async createRoomInDb(room: Partial<Room>): Promise<Room | null> {
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

    if (error) {
      console.error('RoomService [createRoom] Error:', error);
      throw error;
    }
    return data as Room;
  }

  setupGhostUserPrevention(): void {
    window.addEventListener('beforeunload', () => {
      const user = this.authService.currentUser();
      if (!user) return;

      const supabaseUrl = (this.supabase as any).supabaseUrl;
      const supabaseKey = (this.supabase as any).supabaseKey;

      const storageKey = `sb-tndcfswtpisycfeugqnb-auth-token`;
      const sessionData = localStorage.getItem(storageKey);

      let token = supabaseKey; 
      if (sessionData) {
        try {
          token = JSON.parse(sessionData).access_token;
        } catch (e) {}
      }

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
}
