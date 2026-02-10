//
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private supabase = inject(SupabaseService).supabase;

  /**
   * 📜 جلب كافة العلماء (Scholars) من الأرشيف
   * يتم الترتيب بناءً على عمود updated_at لضمان ظهور أحدث التغييرات أولاً
   */
  async getAllUsers() {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ AdminService [getAllUsers] Error:', error.message);
    }
    return { data, error };
  }

  /**
   * 🛡️ تغيير رتبة المستخدم (ترقية لأدمن أو العكس)
   * يقوم بتعديل عمود role بشكل مباشر في قاعدة البيانات
   */
  async updateUserRole(userId: string, newRole: 'admin' | 'scholar') {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
      .select(); 

    if (error) console.error('❌ AdminService [updateUserRole] Error:', error.message);
    return { data, error };
  }

  /**
   * 🚫 نظام الحظر (Block/Unblock)
   * يقوم بتحديث عمود is_banned لمنع المستخدم من دخول الغرف أو المذاكرة
   */
  async updateUserStatus(userId: string, isBanned: boolean) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ is_banned: isBanned })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('❌ AdminService [updateUserStatus] Error:', error.message);
    }
    return { data, error };
  }

  /**
   * 🏰 حذف غرفة نهائياً (إدارة الصروح)
   */
  async deleteRoom(roomId: string) {
    const { error } = await this.supabase
      .from('rooms')
      .delete()
      .eq('id', roomId);

    if (error) console.error('❌ AdminService [deleteRoom] Error:', error.message);
    return !error;
  }
}