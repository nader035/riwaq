import { Routes } from '@angular/router';

export const CORE_ROUTES: Routes = [
  {
    path: 'dashboard',
    title: 'Riwaq | Command Center',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.DashboardComponent),
  },
  {
    path: 'tasks',
    title: 'Riwaq | Daily Directives',
    loadComponent: () => import('./tasks/tasks').then((m) => m.TasksComponent),
  },
  {
    path: 'rooms',
    title: 'Riwaq | Sanctuaries',
    loadComponent: () => import('./rooms/rooms').then((m) => m.RoomsComponent),
  },
  {
    path: 'rooms/:id',
    title: 'Riwaq | Focused Session',
    loadComponent: () =>
      import('./rooms/components/room-detail/room-detail').then((m) => m.RoomDetailComponent),
  },
  {
    path: 'journey',
    title: 'Riwaq | Scholar Journey',
    loadComponent: () => import('./journey/journey').then((m) => m.JourneyComponent),
  },
  {
    path: 'profile',
    title: 'Riwaq | Scholar Identity',
    loadComponent: () => import('./profile/profile').then((m) => m.ProfileComponent),
  },
  {
    path: 'leaderboard',
    title: 'Riwaq | Hall of Consistency',
    loadComponent: () => import('./leaderboard/leaderboard').then((m) => m.LeaderboardComponent),
  },
  {
    path: 'challenges',
    title: 'Riwaq | Trials of Mastery',
    loadComponent: () => import('./challenges-hub/challenges-hub').then((m) => m.ChallengesHub),
  },
  {
    path: 'challenges/quest/:id',
    loadComponent: () =>
      import('./challenges-hub/components/active-quests/active-quests').then(
        (m) => m.ActiveQuests,
      ),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
