import { inject, computed } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState, withHooks } from '@ngrx/signals';
import { NotificationService } from '../services/notification';
import { FocusService } from '../services/focus';
import { AuthService } from '../auth/auth';

export interface FocusState {
  elapsedSeconds: number;
  isActive: boolean;
  timerStatus: 'idle' | 'focusing' | 'break';
  currentRoomId: string | null;
  currentRoomName: string | null;
  startTime: string | null;
}

const initialState: FocusState = {
  elapsedSeconds: 0,
  isActive: false,
  timerStatus: 'idle',
  currentRoomId: null,
  currentRoomName: null,
  startTime: null,
};

const STORAGE_KEY = 'riwaq_timer_backup';
const START_TIME_KEY = 'riwaq_start_time_backup';
const ROOM_ID_KEY = 'riwaq_room_id_backup';
const ROOM_NAME_KEY = 'riwaq_room_name_backup';

export const FocusStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ elapsedSeconds, startTime }) => ({
    formattedTime: computed(() => {
      const s = elapsedSeconds();
      const hrs = Math.floor(s / 3600);
      const mins = Math.floor((s % 3600) / 60);
      const secs = s % 60;
      const pad = (n: number) => n.toString().padStart(2, '0');
      if (hrs > 0) {
        return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
      }
      return `${pad(mins)}:${pad(secs)}`;
    }),
    totalSeconds: computed(() => elapsedSeconds()),
    getRawStartTime: computed(() => startTime())
  })),
  withMethods((store, notify = inject(NotificationService), authService = inject(AuthService), focusService = inject(FocusService)) => {
    let intervalId: any;
    let lastTick = 0;

    const stopInterval = () => {
      if (intervalId) clearInterval(intervalId);
    };

    const clearStorage = () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(START_TIME_KEY);
    };

    const clearRoomStorage = () => {
      localStorage.removeItem(ROOM_ID_KEY);
      localStorage.removeItem(ROOM_NAME_KEY);
    };

    const reset = () => {
      stopInterval();
      patchState(store, {
        elapsedSeconds: 0,
        timerStatus: 'idle',
        isActive: false,
        startTime: null,
      });
      clearStorage();
    };

    const clearRoom = () => {
      patchState(store, {
        currentRoomId: null,
        currentRoomName: null,
      });
      clearRoomStorage();
    };

    const saveStorage = () => {
      const s = store.elapsedSeconds();
      const start = store.startTime();
      const rid = store.currentRoomId();
      const rname = store.currentRoomName();

      if (s > 0) localStorage.setItem(STORAGE_KEY, s.toString());
      if (start) localStorage.setItem(START_TIME_KEY, start);
      if (rid) localStorage.setItem(ROOM_ID_KEY, rid);
      if (rname) localStorage.setItem(ROOM_NAME_KEY, rname);
    };

    return {
      reset,
      clearRoom,
      saveStorage,
      stopInterval,
      restoreState() {
        const savedSeconds = localStorage.getItem(STORAGE_KEY);
        const savedStartTime = localStorage.getItem(START_TIME_KEY);
        const savedRoomId = localStorage.getItem(ROOM_ID_KEY);
        const savedRoomName = localStorage.getItem(ROOM_NAME_KEY);

        patchState(store, {
          elapsedSeconds: savedSeconds ? parseInt(savedSeconds, 10) : 0,
          startTime: savedStartTime || null,
          currentRoomId: savedRoomId || null,
          currentRoomName: savedRoomName || null,
        });
      },
      startTimer() {
        if (store.isActive() && store.timerStatus() === 'focusing') return;

        if (!store.startTime()) {
          patchState(store, { startTime: new Date().toISOString() });
        }

        stopInterval();
        patchState(store, { isActive: true, timerStatus: 'focusing' });

        lastTick = Date.now();
        intervalId = setInterval(() => {
          const now = Date.now();
          const delta = now - lastTick;
          if (delta >= 1000) {
            const passedSecs = Math.floor(delta / 1000);
            patchState(store, { elapsedSeconds: store.elapsedSeconds() + passedSecs });
            lastTick += passedSecs * 1000;
            saveStorage();
          }
        }, 1000);
      },
      pauseTimer() {
        stopInterval();
        patchState(store, { isActive: false, timerStatus: 'break' });
        saveStorage();
      },
      setRoom(roomId: string | null, roomName: string | null) {
        patchState(store, { currentRoomId: roomId, currentRoomName: roomName });
        saveStorage();
      },
      async saveProgress(seconds: number) {
        const user = authService.currentUser();
        const start = store.startTime();
        const end = new Date().toISOString();

        if (!user || seconds <= 0 || !start) return;

        try {
          await focusService.saveFocusSession(user.id, start, end);

          notify.show('Session archived in the sanctuary.', 'success');
          reset();
        } catch (err) {
          console.error('Save error:', err);
          notify.show('Sync failed. Progress kept locally.', 'error');
        }
      }
    };
  }),
  withHooks({
    onInit(store) {
      store.restoreState();
    },
    onDestroy(store) {
      store.stopInterval();
    }
  })
);
