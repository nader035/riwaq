//
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../../core/auth/auth';
import { SidebarService } from '../../../core/services/sidebar';
import { JourneyService } from '../../../core/services/journey';
import { ThemeService } from '../../../core/services/theme';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  public authService = inject(AuthService);
  public sidebarService = inject(SidebarService);
  protected journeyService = inject(JourneyService);
  /* - Riwaq Navigation Architecture: Optimized User Flow */

  protected navItems = [
    // 1. المركز الرئيسي: نقطة الانطلاق
    { link: '/app/dashboard', icon: 'fas fa-th-large', label: 'Dashboard' },

    // 2. العمل اليومي والتنفيذ (Core Actions)
    { link: '/app/rooms', icon: 'fas fa-door-open', label: 'Study Rooms' },
    { link: '/app/tasks', icon: 'fas fa-tasks', label: 'Tasks' },

    // 3. الأهداف والنمو (Growth Engine)
    { link: '/app/challenges', icon: 'fas fa-fire-alt', label: 'Challenges' },
    { link: '/app/journey', icon: 'fas fa-map-signs', label: 'Journey' },

    // 4. المنافسة والشخصية (Status & Social)
    { link: '/app/leaderboard', icon: 'fas fa-medal', label: 'Leaderboard' },
    { link: '/app/profile', icon: 'fas fa-user', label: 'Profile' },
  ];
  userProfile = computed(() => {
    const user = this.authService.currentUser();
    return {
      name: user?.name || 'Scholar',
      avatar: user?.avatar,
      initial: user?.name?.charAt(0).toUpperCase() || 'S',
      role: user?.role || 'scholar',
    };
  });
}
