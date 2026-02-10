//
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
// 🚀 استيراد محرك Signal Forms
import { form, FormField, required, email } from '@angular/forms/signals';
import { AuthService } from '../../../core/auth/auth';
import { NotificationService } from '../../../core/services/notification';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormField, RouterLink],
  templateUrl: './forgot-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  private notify = inject(NotificationService);

  loading = signal(false);
  linkSent = signal(false);

  // 1. الموديل الأساسي
  resetModel = signal({ email: '' });

  // 2. محرك الفاليجيشن (Schema)
  forgotForm = form(this.resetModel, (schemaPath) => {
    required(schemaPath.email, { message: 'Scholar email is required' });
    email(schemaPath.email, { message: 'Enter a valid sanctuary email' });
  });

  async requestReset() {
    if (!this.forgotForm.email().valid()) {
      this.notify.show('Please provide a valid email.', 'error');
      return;
    }

    this.loading.set(true);
    try {
      const { error } = await this.auth.sendResetLink(this.resetModel().email);
      if (error) {
        this.notify.show(error.message, 'error');
      } else {
        this.linkSent.set(true);
        this.notify.show('Recovery scroll has been sent!', 'success');
      }
    } catch (err) {
      this.notify.show('Sanctuary connection lost', 'error');
    } finally {
      this.loading.set(false);
    }
  }
}