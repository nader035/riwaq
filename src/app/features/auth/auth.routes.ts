import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    title: 'Riwaq | Initiate Session',
    loadComponent: () => import('./login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    title: 'Riwaq | Join the Collective',
    loadComponent: () => import('./signup/signup').then((m) => m.SignupComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'update-password',
    loadComponent: () =>
      import('./update-password/update-password').then((m) => m.UpdatePasswordComponent),
  },
];
