//
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { form, FormField, required, email, minLength } from '@angular/forms/signals';
import { AuthService } from '../../../core/auth/auth';
import { NotificationService } from '../../../core/services/notification';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormField, RouterLink],
  templateUrl: './signup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent {
  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // 1. الموديل الأساسي (Signal)
  signupModel = signal({
    name: '',
    email: '',
    password: '',
  });

  // 2. محرك الفاليجيشن (Signal Forms Schema)
  signupForm = form(this.signupModel, (schemaPath) => {
    required(schemaPath.name, { message: 'Scholar name is required' });
    required(schemaPath.email, { message: 'Email address is required' });
    email(schemaPath.email, { message: 'Enter a valid sanctuary email' });
    required(schemaPath.password, { message: 'Security key is required' });
    minLength(schemaPath.password, 8, { message: 'Key must be at least 8 characters' });
  });

  async onSignup(event: Event) {
    event.preventDefault();
    this.errorMessage.set(null);

    // التحقق من صحة الحقول قبل الإرسال
    if (
      !this.signupForm.name().valid() ||
      !this.signupForm.email().valid() ||
      !this.signupForm.password().valid()
    ) {
      this.errorMessage.set('Please fulfill all requirements to join.');
      return;
    }

    this.loading.set(true);
    const { email, password, name } = this.signupModel();

    try {
      const { data, error } = await this.authService.signUp(email, password, name);

      if (error) {
        this.handleSignupError(error);
      } else {
        this.notify.show('Welcome to the Sanctuary! Please verify your email.', 'success');
        this.router.navigate(['/auth/login']);
      }
    } catch (err) {
      this.errorMessage.set('The sanctuary connection was interrupted.');
    } finally {
      this.loading.set(false);
    }
  }

  private handleSignupError(error: any) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already registered')) {
      this.errorMessage.set('This identity is already known to the sanctuary.');
    } else if (msg.includes('weak password')) {
      this.errorMessage.set('Your security key is too weak.');
    } else {
      this.errorMessage.set(error.message);
    }
  }

  async loginWithSocial(provider: 'google' | 'twitter') {
    if (provider === 'twitter') return; // X Access is locked
    this.loading.set(true);
    try {
      await this.authService.signInWithSocial(provider);
    } catch (err) {
      this.notify.show('Social gateway connection failed', 'error');
      this.loading.set(false);
    }
  }
}
