// core/guards/auth-guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { AuthService } from '../auth/auth';

export const authGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

 
  const { data } = await (authService as any).supabase.auth.getSession();

  if (data?.session) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
