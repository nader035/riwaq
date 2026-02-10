import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';

export const routes: Routes = [
  // مسارات ما قبل تسجيل الدخول (صفحة الهبوط)
  {
    path: '',
    loadComponent: () =>
      import('./layouts/landing-layout/landing-layout').then((m) => m.LandingLayout),
    children: [
      { path: '', loadComponent: () => import('./features/landing/hero/hero').then((m) => m.Hero) },
    ],
  },

  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'tasks',
        loadComponent: () => import('./features/tasks/tasks').then((m) => m.TasksComponent),
      },
      {
        path: 'rooms',
        loadComponent: () => import('./features/rooms/rooms').then((m) => m.RoomsComponent),
      },
      {
        path: 'rooms/:id',
        loadComponent: () =>
          import('./features/rooms/components/room-detail/room-detail').then(
            (m) => m.RoomDetailComponent,
          ),
      },
      {
        path: 'journey',
        loadComponent: () => import('./features/journey/journey').then((m) => m.JourneyComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'leaderboard',
        loadComponent: () =>
          import('./features/leaderboard/leaderboard').then((m) => m.LeaderboardComponent),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],

        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      }
    ],
  },

  // مسار تسجيل الدخول
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginComponent),
      },
      {
        path: 'signup',
        loadComponent: () => import('./features/auth/signup/signup').then((m) => m.SignupComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },
      {
        path: 'update-password',
        loadComponent: () =>
          import('./features/auth/update-password/update-password').then(
            (m) => m.UpdatePasswordComponent,
          ),
      },
    ],
  },

  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'app/dashboard' },
];
