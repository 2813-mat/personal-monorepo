import { Component, inject, effect, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopBarComponent } from './topbar.component';
import { ToastContainerComponent } from '../ui/toast/toast-container.component';
import { ExpenseDrawerComponent } from '../features/expense-drawer/expense-drawer.component';
import { AuthService } from '../core/auth/auth.service';
import { AppDataService } from './app-data.service';

@Component({
  selector: 'cf-app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent,
    TopBarComponent,
    ToastContainerComponent,
    ExpenseDrawerComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private auth = inject(AuthService);
  private data = inject(AppDataService);

  // O drawer vive aqui, não no topbar: a bottom-nav do celular é irmã do
  // topbar e não alcançaria um signal local dele.
  protected readonly expenseDrawerOpen = signal(false);

  openExpenseDrawer() {
    this.expenseDrawerOpen.set(true);
  }

  constructor() {
    this.auth.init();

    // Load the month-independent resources once the user is authenticated.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.data.loadCatalog();
        this.data.loadIncomes();
        this.data.loadGoals();
        this.data.loadMonthlyHistory();
        this.data.loadAllInvoiceHistory();
      }
    });

    // (Re)load month-scoped resources when authenticated and whenever the month
    // changes. Fixed expenses belong here because paidThisMonth is relative to
    // the month being viewed.
    effect(() => {
      if (!this.auth.isAuthenticated()) return;
      this.data.currentMonth();
      this.data.loadTransactions();
      this.data.loadFixed();
    });
  }
}
