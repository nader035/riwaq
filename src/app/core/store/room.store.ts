import { inject, NgZone } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withHooks } from '@ngrx/signals';
import { SupabaseService } from '../services/supabase';
import { AuthService } from '../auth/auth';
import { Room } from '../models/room';
import { RoomService } from '../services/room';
import { withCallState } from './features/with-call-state';

export const RoomStore = signalStore(
  { providedIn: 'root' },
  withState<{ rooms: Room[] }>({ rooms: [] }),
  withCallState(),
  withMethods(
    (
      store,
      roomService = inject(RoomService),
      supabaseService = inject(SupabaseService),
      authService = inject(AuthService),
      ngZone = inject(NgZone)
    ) => {
      const supabase = supabaseService.supabase;

      const listenToRoomsRealtime = () => {
        supabase
          .channel('public:rooms')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
            ngZone.run(() => {
              const newData = payload.new as Room;
              const oldData = payload.old as Partial<Room>;

              switch (payload.eventType) {
                case 'INSERT':
                  patchState(store, (state) => ({
                    rooms: [newData, ...state.rooms].sort(
                      (a, b) => (b.current_count || 0) - (a.current_count || 0)
                    ),
                  }));
                  break;

                case 'UPDATE':
                  patchState(store, (state) => ({
                    rooms: state.rooms
                      .map((r) => (r.id === newData.id ? { ...r, ...newData } : r))
                      .sort((a, b) => (b.current_count || 0) - (a.current_count || 0)),
                  }));
                  break;

                case 'DELETE':
                  patchState(store, (state) => ({
                    rooms: state.rooms.filter((r) => r.id !== oldData.id),
                  }));
                  break;
              }
            });
          })
          .subscribe();
      };

      return {
        async fetchRooms() {
          store.setLoading();
          try {
            const data = await roomService.fetchRoomsFromDb();
            patchState(store, { rooms: data });
            store.setLoaded();
          } catch (error) {
            console.error('RoomStore [fetchRooms] Error:', error);
            store.setError('Failed to fetch rooms');
          }
        },

        async joinRoom(roomId: string) {
          try {
            await roomService.joinRoomInDb(roomId);
          } catch (error) {
            console.error('RoomStore [joinRoom] Error:', error);
          }
        },

        async leaveRoom() {
          try {
            await roomService.leaveRoomFromDb();
          } catch (error) {
            console.error('RoomStore [leaveRoom] Error:', error);
          }
        },

        async createRoom(room: Partial<Room>) {
          try {
            return await roomService.createRoomInDb(room);
          } catch (error) {
            console.error('RoomStore [createRoom] Error:', error);
            return null;
          }
        },

        initRoomSystem() {
          this.fetchRooms();
          listenToRoomsRealtime();
          roomService.setupGhostUserPrevention();
        }
      };
    }
  ),
  withHooks({
    onInit(store) {
      store.initRoomSystem();
    }
  })
);
