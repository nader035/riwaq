import { Component, HostListener, signal } from '@angular/core';
import { LandingHeader } from './components/landing-header/landing-header';
import { RouterOutlet } from '@angular/router';
import { Footer } from '../../shared/components/footer/footer';

@Component({
  selector: 'app-landing-layout',
  imports: [LandingHeader, RouterOutlet, Footer],
  templateUrl: './landing-layout.html',
  styleUrl: './landing-layout.css',
})
export class LandingLayout {
  mouseX = signal(0);
  mouseY = signal(0);

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    this.mouseX.set(e.clientX);
    this.mouseY.set(e.clientY);
  }
}
