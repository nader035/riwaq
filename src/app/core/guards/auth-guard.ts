// core/guards/auth-guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { AuthService } from '../auth/auth';
import { SupabaseService } from '../services/supabase';

export const authGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const supabaseService = inject(SupabaseService);

  if (authService.isAuthenticated() && authService.currentUser()) {
    return true;
  }
 
  const { data } = await supabaseService.supabase.auth.getSession();

  if (data?.session) {
    if (!authService.currentUser()) {
      await authService.refreshUserProfile(data.session);
    }
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
