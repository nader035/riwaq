import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { signalStore, withState, withMethods, withComputed, patchState, withHooks } from '@ngrx/signals';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../services/supabase';
import { NotificationService } from '../services/notification';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: 'admin' | 'scholar';
  isBanned: boolean;
  totalFocusSeconds: number;
  dailyFocusSeconds: number;
  currentStreak: number;
  longestStreak: number;
  currentRoomId?: string | null;
}

export interface AuthState {
  session: any | null;
  isAuthenticated: boolean;
  currentUser: UserProfile | null;
  profileChannel: RealtimeChannel | null;
}

const initialState: AuthState = {
  session: null,
  isAuthenticated: false,
  currentUser: null,
  profileChannel: null,
};

export const AuthService = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ currentUser }) => ({
    isAdmin: () => currentUser()?.role?.toLowerCase() === 'admin',
    isBanned: () => currentUser()?.isBanned === true,
  })),
  withMethods((store, supabaseService = inject(SupabaseService), router = inject(Router), notify = inject(NotificationService)) => {
    const supabase = supabaseService.supabase;

    const cleanupAuth = () => {
      if (store.profileChannel()) supabase.removeChannel(store.profileChannel()!);
      patchState(store, { currentUser: null, session: null, isAuthenticated: false, profileChannel: null });
    };

    const handleBannedUser = async () => {
      notify.show('Access revoked. Your essence has been exiled.', 'error');
      cleanupAuth();
      await supabase.auth.signOut();
      router.navigate(['/auth/login']);
    };

    const listenToProfileChanges = () => {
      const user = store.currentUser();
      if (!user) return;

      if (store.profileChannel()) supabase.removeChannel(store.profileChannel()!);

      const channel = supabase
        .channel(`sync_profile_${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            const updated = payload.new as any;
            if (updated.is_banned === true) {
              handleBannedUser();
              return;
            }
            
            patchState(store, (state) => ({
              currentUser: state.currentUser ? {
                ...state.currentUser,
                totalFocusSeconds: updated.total_focus_seconds ?? state.currentUser.totalFocusSeconds,
                dailyFocusSeconds: updated.daily_focus_seconds ?? state.currentUser.dailyFocusSeconds,
                currentStreak: updated.current_streak ?? state.currentUser.currentStreak,
                longestStreak: updated.longest_streak ?? state.currentUser.longestStreak,
                name: updated.name ?? state.currentUser.name,
                avatar: updated.avatar ?? state.currentUser.avatar
              } : null
            }));
          }
        )
        .subscribe();
      
      patchState(store, { profileChannel: channel });
    };

    const refreshUserProfile = async (session: any) => {
      if (!session?.user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (error) throw error;
        if (data) {
          let finalAvatarUrl = data.avatar;
          if (finalAvatarUrl && !finalAvatarUrl.startsWith('http')) {
            const { data: imgData } = supabase.storage.from('avatars').getPublicUrl(finalAvatarUrl);
            finalAvatarUrl = imgData.publicUrl;
          } else if (!finalAvatarUrl && session.user.user_metadata?.['avatar_url']) {
            finalAvatarUrl = session.user.user_metadata['avatar_url'];
          }
          patchState(store, {
            currentUser: {
              id: data.id,
              email: session.user.email,
              name: data.name || 'Scholar',
              avatar: finalAvatarUrl || 'assets/images/default-avatar.png',
              role: data.role || 'scholar',
              isBanned: data.is_banned || false,
              totalFocusSeconds: data.total_focus_seconds || 0,
              dailyFocusSeconds: data.daily_focus_seconds || 0,
              currentStreak: data.current_streak || 0,
              longestStreak: data.longest_streak || 0,
              currentRoomId: data.current_room_id
            }
          });
        }
      } catch (err) {
        console.error('refreshUserProfile Failed:', err);
      }
    };

    const handleSessionUpdate = async (session: any) => {
      patchState(store, { session, isAuthenticated: true });
      await refreshUserProfile(session);
      listenToProfileChanges();
    };

    return {
      refreshUserProfile,
      async initAuth() {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession) {
          await handleSessionUpdate(initialSession);
        }
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (session) {
            await handleSessionUpdate(session);
          } else {
            cleanupAuth();
            if (!router.url.includes('/auth')) {
              router.navigate(['/auth/login']);
            }
          }
        });
      },
      async signIn(email: string, password: string) {
        return await supabase.auth.signInWithPassword({ email, password });
      },
      async signUp(email: string, password: string, name: string) {
        return await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, role: 'scholar' } },
        });
      },
      async signInWithSocial(provider: 'google' | 'twitter') {
        return await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: window.location.origin + '/app/dashboard' },
        });
      },
      async logout() {
        cleanupAuth();
        await supabase.auth.signOut();
        router.navigate(['/auth/login']);
      },
      async sendResetLink(email: string) {
        return await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
      },
      async updatePassword(newPassword: string) {
        return await supabase.auth.updateUser({ password: newPassword });
      },
      updateCurrentUser(updates: Partial<UserProfile>) {
        patchState(store, (state) => ({
          currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null
        }));
      }
    };
  }),
  withHooks({
    onInit(store) {
      store.initAuth();
    }
  })
);