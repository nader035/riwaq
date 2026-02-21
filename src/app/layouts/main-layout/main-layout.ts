import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth';
import { SidebarService } from '../../core/services/sidebar';
import { Notification } from '../../shared/components/notification/notification';
import { Confirm } from '../../shared/components/confirm/confirm';
import { ConfirmService } from '../../core/services/confirm';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, SidebarComponent, Notification, Confirm],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {
  public authService = inject(AuthService);
  sidebarService = inject(SidebarService);
  confirmService = inject(ConfirmService);
  mouseX = signal(0);
  mouseY = signal(0);

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    this.mouseX.set(e.clientX);
    this.mouseY.set(e.clientY);
  }
}
