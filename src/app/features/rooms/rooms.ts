//
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';

// استيراد الخدمات الأساسية والواجهات
import { RoomService, Room } from '../../core/services/room';
import { Focus } from '../../core/services/focus';
import { AuthService } from '../../core/auth/auth';
import { NotificationService } from '../../core/services/notification';
import { SupabaseService } from '../../core/services/supabase';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  templateUrl: './rooms.html',
})
//
export class RoomsComponent implements OnInit {
  protected roomService = inject(RoomService);
  protected focus = inject(Focus);
  protected authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  loading = signal(true);
  isModalOpen = signal(false);
  selectedIcon = signal('fa-laptop-code');
  icons = ['fa-laptop-code', 'fa-book-open', 'fa-coffee', 'fa-brain', 'fa-music', 'fa-pencil-alt'];

  async ngOnInit() {
    try {
      // جلب البيانات الأولية فقط، الـ Realtime شغال في الخلفية من خلال الـ Service
      await this.roomService.fetchRooms();

      if (window.history.state?.openModal) {
        this.openCreateModal();
      }
    } catch (err) {
      this.notify.show('Error loading sanctuaries', 'error');
    } finally {
      setTimeout(() => this.loading.set(false), 500);
    }
  }


  async joinRoom(room: Room) {
    this.router.navigate(['/app/rooms', room.id]);
  }

  openCreateModal() {
    this.isModalOpen.set(true);
  }

  async handleCreate(name: string) {
    if (!name || name.trim().length < 3) {
      this.notify.show('Name must be at least 3 characters', 'error');
      return;
    }

    const success = await this.roomService.createRoom({
      name: name.trim(),
      icon: this.selectedIcon(),
      description: 'A sanctuary dedicated to profound focus and collective growth.',
    });

    if (success) {
      this.isModalOpen.set(false);
      this.notify.show('Sanctuary established successfully', 'success');
    }
  }
}
