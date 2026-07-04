import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopBarComponent } from './topbar.component';
import { ToastContainerComponent } from '../ui/toast/toast-container.component';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'cf-app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopBarComponent, ToastContainerComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private auth = inject(AuthService);

  constructor() {
    this.auth.init();
  }
}
