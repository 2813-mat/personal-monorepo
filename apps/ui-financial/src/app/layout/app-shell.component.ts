import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopBarComponent } from './topbar.component';

@Component({
  selector: 'cf-app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopBarComponent],
  template: `
    <div class="shell">
      <cf-sidebar class="shell__sidebar" />
      <div class="shell__main">
        <cf-topbar />
        <div class="shell__content">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: grid;
      grid-template-columns: 200px 1fr;
      height: 100vh;
      width: 100%;
      overflow: hidden;
    }
    .shell__sidebar {
      grid-row: 1;
    }
    .shell__main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      height: 100vh;
      overflow: hidden;
    }
    .shell__content {
      flex: 1;
      overflow-y: auto;
      background: var(--bg);
      padding: 16px 20px;
    }
  `],
})
export class AppShellComponent {}
