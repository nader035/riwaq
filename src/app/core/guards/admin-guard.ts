//
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth';
import { NotificationService } from '../services/notification';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take, of, switchMap } from 'rxjs';

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);

  if (auth.currentUser()) {
    return checkAdmin(auth, router, notify);
  }

  return toObservable(auth.currentUser).pipe(
    filter((user) => user !== null),
    take(1), 
    map(() => checkAdmin(auth, router, notify)),
  );
};

function checkAdmin(auth: any, router: Router, notify: any): boolean {
  if (auth.isAdmin()) {
    return true;
  }

  console.warn('Unauthorized access attempt');
  notify.show('Access Denied: Admins Only', 'error');
  router.navigate(['/app/dashboard']);
  return false;
}
