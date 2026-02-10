//
import { Routes } from '@angular/router';
import { AdminBroadcastComponent } from './pages/admin-broadcast/admin-broadcast';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent),
  },
  { path: 'broadcast', component: AdminBroadcastComponent },

  // 💡 هنا تقدر تضيف (Dashboard للأدمن، إدارة اليوزرز، إحصائيات عامة)
  { path: '', redirectTo: 'broadcast', pathMatch: 'full' },
];
