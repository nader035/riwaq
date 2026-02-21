/* - Riwaq Core Auth: High-Performance Identity Engine v3.5 */
import { Injectable, inject, signal, computed, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService).supabase;
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private notify = inject(NotificationService);

  // --- Signals (The Reactive Core) ---
  session = signal<any>(null);
  isAuthenticated = signal<boolean>(false);
  currentUser = signal<UserProfile | null>(null);

  private profileChannel?: RealtimeChannel;

  // --- Computed States ---
  isAdmin = computed(() => this.currentUser()?.role?.toLowerCase() === 'admin');
  isBanned = computed(() => this.currentUser()?.isBanned === true);

  constructor() {
    this.initAuth();
  }

  /**
   * 🛡️ تهيئة المصادقة ومراقبة الجلسة
   */
  private async initAuth() {
    const { data: { session: initialSession } } = await this.supabase.auth.getSession();

    if (initialSession) {
      await this.handleSessionUpdate(initialSession);
    }

    // مراقب التغير في حالة الدخول (Login/Logout/Token Refresh)
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.ngZone.run(async () => {
        if (session) {
          await this.handleSessionUpdate(session);
        } else {
          this.cleanupAuth();
          if (!this.router.url.includes('/auth')) {
            this.router.navigate(['/auth/login']);
          }
        }
      });
    });
  }

  /**
   * 🔄 معالج الجلسة: تحديث البيانات وفتح قنوات المزامنة
   */
  private async handleSessionUpdate(session: any) {
    this.session.set(session);
    this.isAuthenticated.set(true);
    await this.refreshUserProfile(session);
    this.listenToProfileChanges();
  }

  /**
   * 🎭 مزامنة البروفايل وعلاج مشكلة الصور (Avatar Normalization)
   */
  async refreshUserProfile(session: any) {
    if (!session?.user) return;

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      if (data) {
        let finalAvatarUrl = data.avatar;

        // 1. Storage Avatar Resolver: تحويل أسماء الملفات لروابط عامة
        if (finalAvatarUrl && !finalAvatarUrl.startsWith('http')) {
          const { data: imgData } = this.supabase.storage
            .from('avatars')
            .getPublicUrl(finalAvatarUrl);
          finalAvatarUrl = imgData.publicUrl;
        }
        // 2. OAuth Fallback: لو مفيش صورة، استلف صورة جوجل/تويتر
        else if (!finalAvatarUrl && session.user.user_metadata?.['avatar_url']) {
          finalAvatarUrl = session.user.user_metadata['avatar_url'];
        }

        // 3. Mapping: تحويل مسميات الداتابيز لمسميات الكود (CamelCase)
        this.currentUser.set({
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
        });
      }
    } catch (err) {
      console.error('refreshUserProfile Failed:', err);
    }
  }

  /**
   * ⚡ المزامنة اللحظية (Real-time Broadcast)
   * يضمن تحديث الـ XP والـ Streak فوراً عند انتهاء جلسة التركيز
   */
  private listenToProfileChanges() {
    const user = this.currentUser();
    if (!user) return;

    if (this.profileChannel) this.supabase.removeChannel(this.profileChannel);

    this.profileChannel = this.supabase
      .channel(`sync_profile_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          this.ngZone.run(() => {
            const updated = payload.new as any;
            
            // صمام أمان الحظر
            if (updated.is_banned === true) {
              this.handleBannedUser();
              return;
            }

            // تحديث جزئي للسيجنال لضمان سلاسة الواجهة
            this.currentUser.update((prev) => prev ? {
              ...prev,
              totalFocusSeconds: updated.total_focus_seconds ?? prev.totalFocusSeconds,
              dailyFocusSeconds: updated.daily_focus_seconds ?? prev.dailyFocusSeconds,
              currentStreak: updated.current_streak ?? prev.currentStreak,
              longestStreak: updated.longest_streak ?? prev.longestStreak,
              name: updated.name ?? prev.name,
              avatar: updated.avatar ?? prev.avatar
            } : null);
          });
        }
      )
      .subscribe();
  }

  private async handleBannedUser() {
    this.notify.show('Access revoked. Your essence has been exiled.', 'error');
    await this.logout();
  }

  // --- Auth Actions ---

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signUp(email: string, password: string, name: string) {
    return await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role: 'scholar' } },
    });
  }

  async signInWithSocial(provider: 'google' | 'twitter') {
    return await this.supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/app/dashboard' },
    });
  }

  async logout() {
    this.cleanupAuth();
    await this.supabase.auth.signOut();
    this.router.navigate(['/auth/login']);
  }

  private cleanupAuth() {
    if (this.profileChannel) this.supabase.removeChannel(this.profileChannel);
    this.currentUser.set(null);
    this.session.set(null);
    this.isAuthenticated.set(false);
  }

  async sendResetLink(email: string) {
    return await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
  }

  async updatePassword(newPassword: string) {
    return await this.supabase.auth.updateUser({ password: newPassword });
  }
}