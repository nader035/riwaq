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
        path: 'dashboard',
        title: 'Riwaq | Command Center',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'tasks',
        title: 'Riwaq | Daily Directives',
        loadComponent: () => import('./features/tasks/tasks').then((m) => m.TasksComponent),
      },
      {
        path: 'rooms',
        title: 'Riwaq | Sanctuaries',
        loadComponent: () => import('./features/rooms/rooms').then((m) => m.RoomsComponent),
      },
      {
        path: 'rooms/:id',
        title: 'Riwaq | Focused Session',
        loadComponent: () =>
          import('./features/rooms/components/room-detail/room-detail').then(
            (m) => m.RoomDetailComponent,
          ),
      },
      {
        path: 'journey',
        title: 'Riwaq | Scholar Journey',
        loadComponent: () => import('./features/journey/journey').then((m) => m.JourneyComponent),
      },
      {
        path: 'profile',
        title: 'Riwaq | Scholar Identity',
        loadComponent: () => import('./features/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'leaderboard',
        title: 'Riwaq | Hall of Consistency',
        loadComponent: () =>
          import('./features/leaderboard/leaderboard').then((m) => m.LeaderboardComponent),
      },
      {
        path: 'challenges',
        title: 'Riwaq | Trials of Mastery',
        loadComponent: () =>
          import('./features/challenges-hub/challenges-hub').then((m) => m.ChallengesHub),
      },
      {
        path: 'challenges/quest/:id',
        loadComponent: () =>
          import('./features/challenges-hub/components/active-quests/active-quests').then(
            (m) => m.ActiveQuests,
          ),
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
        path: 'login',
        title: 'Riwaq | Initiate Session',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginComponent),
      },
      {
        path: 'signup',
        title: 'Riwaq | Join the Collective',
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

  // 🛡️ 4. GLOBAL SAFETY REDIRECTS
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  { path: '**', redirectTo: 'app/dashboard' },
];
