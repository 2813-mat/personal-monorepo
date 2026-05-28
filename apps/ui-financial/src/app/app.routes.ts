import { Route } from '@angular/router';
import { AppShellComponent } from './layout/app-shell.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./features/transactions/transactions.component').then(m => m.TransactionsComponent),
      },
      {
        path: 'cards',
        loadComponent: () =>
          import('./features/cards/cards.component').then(m => m.CardsComponent),
      },
      {
        path: 'budgets',
        loadComponent: () =>
          import('./features/budgets/budgets.component').then(m => m.BudgetsComponent),
      },
      {
        path: 'fixed',
        loadComponent: () =>
          import('./features/fixed/fixed.component').then(m => m.FixedComponent),
      },
    ],
  },
];
