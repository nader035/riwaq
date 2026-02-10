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

  // إشارات الحالة (Signals)
  session = signal<any>(null);
  isAuthenticated = signal<boolean>(false);
  currentUser = signal<UserProfile | null>(null);

  private profileChannel?: RealtimeChannel;

  // إشارات محسوبة (Computed)
  isAdmin = computed(() => this.currentUser()?.role?.toLowerCase() === 'admin');
  isBanned = computed(() => this.currentUser()?.isBanned === true);

  constructor() {
    this.initAuth();
  }

  /**
   * 🛡️ تهيئة المصادقة ومراقبة الجلسة
   */
  private async initAuth() {
    const {
      data: { session: initialSession },
    } = await this.supabase.auth.getSession();

    if (initialSession) {
      this.session.set(initialSession);
      this.isAuthenticated.set(true);
      await this.refreshUserProfile(initialSession);
      this.listenToProfileChanges();
    }

    this.supabase.auth.onAuthStateChange((event, session) => {
      this.ngZone.run(async () => {
        if (session) {
          this.session.set(session);
          this.isAuthenticated.set(true);
          await this.refreshUserProfile(session);
          this.listenToProfileChanges();
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
   * 🔄 مزامنة البروفايل وعلاج مشكلة الصور (Avatar Fix)
   */
  //
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
        // 🖼️ حل مشكلة الأفاتار: تحويل اسم الملف لرابط كامل فوراً
        let finalAvatarUrl = data.avatar;
        if (finalAvatarUrl && !finalAvatarUrl.startsWith('http')) {
          const { data: imgData } = this.supabase.storage
            .from('avatars') // 👈 تأكد من اسم الـ Bucket عندك
            .getPublicUrl(finalAvatarUrl);
          finalAvatarUrl = imgData.publicUrl;
        }

        this.currentUser.set({
          ...data,
          id: data.id,
          name: data.name,
          avatar: finalAvatarUrl, // 👈 الآن البروفايل يحتوي على رابط "شغال" دائماً
          isBanned: data.is_banned || false,
          totalFocusSeconds: data.total_focus_seconds || 0,
          dailyFocusSeconds: data.daily_focus_seconds || 0,
          currentStreak: data.current_streak || 0,
          longestStreak: data.longest_streak || 0,
        });
      }
    } catch (err) {
      console.error('AuthService Error:', err);
    }
  }

  /**
   * ⚡ المراقبة اللحظية (Real-time Sync)
   */
  private listenToProfileChanges() {
    const user = this.currentUser();
    if (!user) return;

    if (this.profileChannel) this.supabase.removeChannel(this.profileChannel);

    this.profileChannel = this.supabase
      .channel(`profile_sync_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          this.ngZone.run(() => {
            const updated = payload.new as any;
            if (updated.is_banned === true) {
              this.handleBannedUser();
              return;
            }
            this.currentUser.update((prev) => (prev ? { ...prev, ...updated } : null));
          });
        },
      )
      .subscribe();
  }

  private async handleBannedUser() {
    this.notify.show('Access revoked. You have been exiled.', 'error');
    await this.logout();
  }

  // --- 🔐 العمليات الأساسية (Authentication Operations) ---

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  /**
   * 📝 إنشاء حساب جديد (تمت استعادتها لفك الخطأ TS2339)
   */
  async signUp(email: string, password: string, name: string) {
    return await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role: 'scholar' } },
    });
  }

  async signInWithSocial(provider: 'google' | 'twitter') {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/app/dashboard' },
    });
    if (error) throw error;
    return data;
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

  // --- 🛠️ إدارة الحساب والباسورد (تمت استعادتها) ---

  /**
   * 📧 إرسال رابط إعادة تعيين كلمة المرور
   */
  async sendResetLink(email: string) {
    return await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
  }

  /**
   * 🔑 تحديث كلمة المرور الجديدة
   */
  async updatePassword(newPassword: string) {
    return await this.supabase.auth.updateUser({ password: newPassword });
  }
}
