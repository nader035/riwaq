/* - Riwaq Landing Architecture: Dynamic Ambient HUD v3.0 */
import { Component, HostListener, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LandingHeader } from './components/landing-header/landing-header';
import { Footer } from '../../shared/components/footer/footer';

@Component({
  selector: 'app-landing-layout',
  standalone: true,
  imports: [LandingHeader, RouterOutlet, Footer],
  templateUrl: './landing-layout.html',
  styleUrl: './landing-layout.css',
  // 🔥 OnPush: لضمان أن تتبع الماوس لا يستهلك موارد المعالج في رندرة المكونات الثابتة
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingLayout {
  /**
   * 🛸 الإحداثيات اللحظية (Reactive Tracking)
   * نستخدم الـ Signals لضمان تحديث الـ Ambient Glow بسرعة 60 إطار في الثانية
   */
  mouseX = signal(0);
  mouseY = signal(0);

  /**
   * 🛰️ محرك تتبع الحركة العالمي
   * يقوم بتحديث متغيرات الـ CSS في الـ Template لخلق تأثير الإضاءة الديناميكية
   */
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    // نستخدم clientX/Y للحصول على الإحداثيات بدقة بالنسبة للشاشة
    this.mouseX.set(e.clientX);
    this.mouseY.set(e.clientY);
  }
}