/* - Riwaq Routing Architecture: High-Performance HUD v4.5 */
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';

export const routes: Routes = [
  // 🛸 1. THE GATEWAY (Landing Page)
  {
    path: '',
    loadComponent: () =>
      import('./layouts/landing-layout/landing-layout').then((m) => m.LandingLayout),
    children: [
      {
        path: '',
        title: 'Riwaq | Master Your Focus Together',
        loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
      },
    ],
  },

  // 🏰 2. THE SANCTUARY (Authenticated App Core)
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: '',
        loadChildren: () => import('./features/core.routes').then((m) => m.CORE_ROUTES),
      },
      // 🛡️ Admin Command Center (Isolated Payload)
      {
        path: 'admin',
        canActivate: [adminGuard],
        title: 'Riwaq | Admin Terminal',
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      // Default app redirect
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // 🔑 3. AUTH TERMINAL (Identity Management)
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: '',
        loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
      },
    ],
  },

  // 🛡️ 4. GLOBAL SAFETY REDIRECTS
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  { path: '**', redirectTo: 'app/dashboard' },
];
