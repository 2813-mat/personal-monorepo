import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopBarComponent } from './topbar.component';
import { ToastContainerComponent } from '../ui/toast/toast-container.component';

@Component({
  selector: 'cf-app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopBarComponent, ToastContainerComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {}
