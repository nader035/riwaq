/* - Riwaq Study Rooms: High-Performance Social Logic v3.0 */
import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Core Services & Interfaces
import { RoomService, Room } from '../../core/services/room';
import { Focus } from '../../core/services/focus';
import { AuthService } from '../../core/auth/auth';
import { NotificationService } from '../../core/services/notification';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton';
import { SidebarService } from '../../core/services/sidebar';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  templateUrl: './rooms.html',
  // 🔥 تحسين الأداء: المكون لا يتحقق من التغييرات إلا عند تحديث الـ Signals
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomsComponent implements OnInit {
  // --- Injections ---
  protected roomService = inject(RoomService);
  protected focus = inject(Focus);
  protected authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  sidebarService = inject(SidebarService);
  // --- UI State Signals ---
  isModalOpen = signal(false);
  selectedIcon = signal('fa-laptop-code');

  // أيقونات متنوعة تمثل أجواء المذاكرة المختلفة
  icons = [
    'fa-laptop-code',
    'fa-book-open',
    'fa-coffee',
    'fa-brain',
    'fa-music',
    'fa-pencil-alt',
    'fa-university',
    'fa-microscope',
    'fa-lightbulb',
  ];

  /**
   * 🔄 تهيئة البيانات عند فتح الصفحة
   */
  async ngOnInit() {
    try {
      // جلب الغرف (الـ Real-time مفعل تلقائياً داخل الـ RoomService)
      await this.roomService.fetchRooms();

      // فحص إذا كان المستخدم قادماً لإنشاء غرفة مباشرة
      if (window.history.state?.openModal) {
        this.isModalOpen.set(true);
      }
    } catch (err) {
      this.notify.show('Failed to load study rooms', 'error');
    }
  }

  /**
   * 🚀 الانتقال لغرفة مذاكرة معينة
   */
  async joinRoom(room: Room) {
    // التوجيه لصفحة الغرفة، والـ Service هناك ستتولى الـ Presence Ping
    this.router.navigate(['/app/rooms', room.id]);
  }

  /**
   * ✨ إنشاء غرفة مذاكرة جديدة (خاص بالـ Admin)
   */
  async handleCreate(name: string) {
    if (!name || name.trim().length < 3) {
      this.notify.show('Room name must be at least 3 characters', 'error');
      return;
    }

    const success = await this.roomService.createRoom({
      name: name.trim(),
      icon: this.selectedIcon(),
      description: 'A dedicated space for deep focus and shared mastery.',
    });

    if (success) {
      this.isModalOpen.set(false);
      this.notify.show('Room created successfully', 'success');
      // لا نحتاج لإعادة الجلب يدوياً لأن الـ Realtime سيحدث القائمة فوراً
    } else {
      this.notify.show('Failed to create room', 'error');
    }
  }
}
