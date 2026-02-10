//
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { form, FormField, required, minLength } from '@angular/forms/signals';
import { AuthService } from '../../../core/auth/auth';
import { NotificationService } from '../../../core/services/notification';

@Component({
  selector: 'app-update-password',
  standalone: true,
  imports: [CommonModule, FormField, RouterModule],
  templateUrl: './update-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdatePasswordComponent {
  private auth = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  loading = signal(false);
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);

  // 1. الموديل
  passwordModel = signal({ password: '' });

  // 2. الفاليجيشن
  updateForm = form(this.passwordModel, (schemaPath) => {
    required(schemaPath.password, { message: 'A new security key is required' });
    minLength(schemaPath.password, 8, { message: 'Key must be at least 8 characters' });
  });

  async onUpdate() {
    this.errorMessage.set(null);

    if (!this.updateForm.password().valid()) {
      this.errorMessage.set('The security key does not meet sanctuary standards.');
      return;
    }

    this.loading.set(true);
    try {
      const { error } = await this.auth.updatePassword(this.passwordModel().password);
      if (error) {
        this.errorMessage.set(error.message);
      } else {
        this.notify.show('Security key updated successfully!', 'success');
        this.router.navigate(['/app/dashboard']);
      }
    } catch (err) {
      this.errorMessage.set('Sanctuary connection error.');
    } finally {
      this.loading.set(false);
    }
  }

  toggleVisibility() {
    this.showPassword.update((v) => !v);
  }
}
