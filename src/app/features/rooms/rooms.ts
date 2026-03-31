/* - Riwaq Study Rooms: High-Performance Social Logic v4.0 */
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

  async ngOnInit() {
    try {
      await this.roomService.fetchRooms();
      if (window.history.state?.openModal) {
        this.isModalOpen.set(true);
      }
    } catch (err) {
      this.notify.show('Failed to load study sanctuaries', 'error');
    }
  }

  async joinRoom(room: Room) {
    this.router.navigate(['/app/rooms', room.id]);
  }

  async handleCreate(name: string) {
    if (!name || name.trim().length < 3) {
      this.notify.show('Protocol requires at least 3 characters', 'error');
      return;
    }

    const success = await this.roomService.createRoom({
      name: name.trim(),
      icon: this.selectedIcon(),
      description: 'A dedicated space for deep focus and shared mastery.',
    });

    if (success) {
      this.isModalOpen.set(false);
      this.notify.show('Sanctuary established successfully', 'success');
    } else {
      this.notify.show('Failed to initiate room sequence', 'error');
    }
  }
}
