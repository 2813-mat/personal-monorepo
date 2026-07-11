import { Component, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopBarComponent } from './topbar.component';
import { ToastContainerComponent } from '../ui/toast/toast-container.component';
import { AuthService } from '../core/auth/auth.service';
import { AppDataService } from './app-data.service';

@Component({
  selector: 'cf-app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopBarComponent, ToastContainerComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private auth = inject(AuthService);
  private data = inject(AppDataService);

  constructor() {
    this.auth.init();

    // Load the catalog and incomes once the user is authenticated.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.data.loadCatalog();
        this.data.loadIncomes();
      }
    });

    // (Re)load transactions when authenticated and whenever the month changes.
    effect(() => {
      if (!this.auth.isAuthenticated()) return;
      this.data.currentMonth();
      this.data.loadTransactions();
    });
  }
}
