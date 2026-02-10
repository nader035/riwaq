//
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-landing-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './landing-header.html',
  styleUrl: './landing-header.css',
})
export class LandingHeader {
  protected auth = inject(AuthService);
  private router = inject(Router);

  // 👈 المسار المطلق للصورة (تأكد من وجود الملف في assets/images/)
  protected readonly DEFAULT_AVATAR = 'assets/images/default-avatar.png';

  protected navItems = [
    { link: '/app/dashboard', icon: 'fas fa-th-large', label: 'Dashboard' },
    { link: '/app/rooms', icon: 'fas fa-door-open', label: 'Study Rooms' },
    { link: '/app/tasks', icon: 'fas fa-tasks', label: 'Tasks' },
    { link: '/app/journey', icon: 'fas fa-map-signs', label: 'Journey' },
    { link: '/app/leaderboard', icon: 'fas fa-medal', label: 'Rankings' },
  ];

  /**
   * 🛡️ دالة الطوارئ عند فشل تحميل الصورة
   */
  handleImageError(event: any) {
    event.target.src = this.DEFAULT_AVATAR;

  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/']);
  }
}