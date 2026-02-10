import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationService } from './core/services/notification';
import * as AOS from 'aos';
import 'aos/dist/aos.css'; 

@Component({
  selector: 'app-root',
  standalone: true, 
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('riwaq-v2');
  notificationService = inject(NotificationService);

  ngOnInit() {
    AOS.init({
      duration: 1000,
      once: true,
      mirror: false,
      offset: 50, 
    });
  }
}