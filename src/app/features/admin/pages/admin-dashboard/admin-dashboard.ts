//
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// استيراد الخدمات الأساسية
import { AdminService } from '../../../../core/services/admin';
import { RoomService } from '../../../../core/services/room';
import { NotificationService } from '../../../../core/services/notification';
import { ConfirmService } from '../../../../core/services/confirm';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboardComponent implements OnInit {
  adminService = inject(AdminService);
  roomService = inject(RoomService);
  confirmService = inject(ConfirmService);
  private notify = inject(NotificationService);

  // --- الحالة (State) ---
  activeTab = signal<'users' | 'rooms'>('users');
  searchQuery = signal('');
  loading = signal(true);
  users = signal<any[]>([]);

  // --- 🔍 البحث الذكي المدمج ---
  // يقوم بفلترة المستخدمين لحظياً بمجرد كتابة أي حرف
  filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.users();

    return this.users().filter(
      (u) => u.name?.toLowerCase().includes(query) || u.id?.toLowerCase().includes(query),
    );
  });

  async ngOnInit() {
    await this.refreshData();
  }

  /**
   * 🔄 جلب كافة البيانات من السيرفر
   */
  async refreshData() {
    this.loading.set(true);
    try {
      const { data, error } = await this.adminService.getAllUsers();
      if (error) throw error;
      if (data) this.users.set(data);

      await this.roomService.fetchRooms();
    } catch (err) {
      this.notify.show('Failed to synchronize Archive data', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 🛡️ تبديل الرتبة (Admin <-> Scholar)
   */
  async toggleRole(user: any) {
    const newRole = user.role === 'admin' ? 'scholar' : 'admin';
    const { error } = await this.adminService.updateUserRole(user.id, newRole);

    if (!error) {
      this.updateUserInList(user.id, { role: newRole });
      this.notify.show(`${user.name} is now a ${newRole}`, 'success');
    } else {
      this.notify.show('Authority update failed', 'error');
    }
  }

  /**
   * 🚫 نظام الحظر (Ban / Unban)
   */
  async toggleBlock(user: any) {
    const newStatus = !user.is_banned;
    const { error } = await this.adminService.updateUserStatus(user.id, newStatus);

    if (!error) {
      this.updateUserInList(user.id, { is_banned: newStatus });
      this.notify.show(
        newStatus ? 'Scholar exiled' : 'Scholar reinstated',
        newStatus ? 'error' : 'success',
      );
    } else {
      this.notify.show('Exile command failed', 'error');
    }
  }

  /**
   * 🏰 حذف غرفة (Delete Sanctuary)
   */
  async deleteRoom(roomId: string) {
    if (await this.confirmService.ask('Are you sure you want to dissolve this sanctuary?')) {
      const success = await this.adminService.deleteRoom(roomId);
      if (success) {
        this.notify.show('Sanctuary dissolved', 'success');
        await this.roomService.fetchRooms(); // تحديث قائمة الغرف
      }
    }
  }

  // تحديث السجنل محلياً لضمان سرعة الاستجابة في الـ UI
  private updateUserInList(userId: string, changes: any) {
    this.users.update((prev) => prev.map((u) => (u.id === userId ? { ...u, ...changes } : u)));
  }

  formatHours(seconds: number): string {
    return (seconds / 3600).toFixed(1);
  }
}
