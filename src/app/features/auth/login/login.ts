//
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { form, FormField, required, email } from '@angular/forms/signals';
import { AuthService } from '../../../core/auth/auth';
import { NotificationService } from '../../../core/services/notification';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormField, RouterLink],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  loading = signal(false);
  // 🛡️ إشارة لتخزين رسالة الخطأ الحالية
  errorMessage = signal<string | null>(null);

  loginModel = signal({ email: '', password: '' });

  loginForm = form(this.loginModel, (schemaPath) => {
    required(schemaPath.email, { message: 'Email is required' });
    email(schemaPath.email, { message: 'Enter a valid email' });
    required(schemaPath.password, { message: 'Password is required' });
  });

  async onSubmit(event: Event) {
    event.preventDefault();
    this.errorMessage.set(null); // ريست لأي خطأ قديم

    // 1. تشيك على الـ Client-side validation
    if (!this.loginForm.email().valid() || !this.loginForm.password().valid()) {
      this.errorMessage.set('Please check your email and password format.');
      return;
    }

    this.loading.set(true);
    const { email, password } = this.loginModel();

    try {
      const { data, error } = await this.authService.signIn(email, password);

      if (error) {
        // 2. معالجة أخطاء سوبابيز (باسورد غلط، إيميل مش موجود، إلخ)
        this.handleAuthError(error);
      } else if (data.user) {
        this.notify.show('Welcome back to the sanctuary', 'success');
        // الانتقال للداشبورد
        this.router.navigate(['/app/dashboard']);
      }
    } catch (err) {
      this.errorMessage.set('An unexpected connection error occurred.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 🛠️ مترجم أخطاء سوبابيز للغة عربية/إنجليزية مفهومة
   */
  private handleAuthError(error: any) {
    const msg = error.message.toLowerCase();
    
    if (msg.includes('invalid login credentials')) {
      this.errorMessage.set('Incorrect email or password. Please try again.');
    } else if (msg.includes('email not confirmed')) {
      this.errorMessage.set('Please confirm your email address before signing in.');
    } else if (msg.includes('too many requests')) {
      this.errorMessage.set('Too many attempts. Please wait a moment and try again.');
    } else {
      this.errorMessage.set(error.message);
    }
  }

  async loginWithSocial(provider: 'google' | 'twitter') {
    if (provider === 'twitter') return;
    this.loading.set(true);
    try {
      await this.authService.signInWithSocial(provider);
    } catch (err) {
      this.notify.show(`Failed to connect with ${provider}`, 'error');
      this.loading.set(false);
    }
  }
}