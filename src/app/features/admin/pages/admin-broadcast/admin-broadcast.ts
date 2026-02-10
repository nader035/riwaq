//
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth';
import { NotificationService } from '../../../../core/services/notification';


@Component({
  selector: 'app-admin-broadcast',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-broadcast.html',
})
export class AdminBroadcastComponent {
  private notify = inject(NotificationService);
  protected auth = inject(AuthService);

  // إشارات لبيانات النموذج
  title = signal('');
  message = signal('');
  type = signal<'info' | 'success' | 'rank'>('info');
  isSending = signal(false);

  /**
   * 🚀 إرسال الرسالة لكل المستخدمين
   */
  async sendBroadcast() {
    if (!this.message() || !this.title()) {
      this.notify.show('Please fill all fields', 'error');
      return;
    }

    this.isSending.set(true);

    try {
      await this.notify.broadcast(this.title(), this.message(), this.type());

      this.notify.show('Broadcast sent successfully!', 'success');

      // تصفير الحقول بعد الإرسال
      this.title.set('');
      this.message.set('');
    } catch (err) {
      this.notify.show('Failed to send broadcast', 'error');
    } finally {
      this.isSending.set(false);
    }
  }
}
