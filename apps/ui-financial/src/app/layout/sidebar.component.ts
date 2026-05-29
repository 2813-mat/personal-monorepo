import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../ui/icon/icon.component';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', route: '/dashboard' },
  {
    id: 'transactions',
    label: 'Transações',
    icon: 'list',
    route: '/transactions',
  },
  { id: 'cards', label: 'Cartões', icon: 'card', route: '/cards' },
  { id: 'fixed', label: 'Gastos fixos', icon: 'repeat', route: '/fixed' },
  { id: 'budgets', label: 'Orçamentos', icon: 'target', route: '/budgets' },
  { id: 'goals', label: 'Metas', icon: 'flame', route: '/goals' },
  { id: 'reports', label: 'Relatórios', icon: 'chart', route: '/reports' },
  {
    id: 'settings',
    label: 'Configurações',
    icon: 'settings',
    route: '/settings',
  },
];

@Component({
  selector: 'cf-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <aside class="sb">
      <div class="sb-brand">
        <div class="sb-brand-mark">CF</div>
        <div class="sb-brand-info">
          <div class="sb-brand-name">Planejador Financeiro</div>
          <div class="sb-brand-sub">Mateus &amp; Thais</div>
        </div>
      </div>

      <div class="sb-section-label">Operação</div>
      @for (item of operacao; track item.id) {
        <a class="sb-item" [routerLink]="item.route" routerLinkActive="active">
          <cf-icon [name]="item.icon" [size]="13" />
          <span>{{ item.label }}</span>
        </a>
      }

      <div class="sb-section-label">Planejamento</div>
      @for (item of planejamento; track item.id) {
        <a class="sb-item" [routerLink]="item.route" routerLinkActive="active">
          <cf-icon [name]="item.icon" [size]="13" />
          <span>{{ item.label }}</span>
        </a>
      }

      <div class="sb-section-label">Sistema</div>
      @for (item of sistema; track item.id) {
        <a class="sb-item" [routerLink]="item.route" routerLinkActive="active">
          <cf-icon [name]="item.icon" [size]="13" />
          <span>{{ item.label }}</span>
        </a>
      }

      <div class="sb-foot">
        <span class="sb-avatar">MT</span>
        <div class="sb-foot-info">
          <div class="sb-foot-name">Mateus</div>
          <div class="sb-foot-role">admin</div>
        </div>
        <cf-icon name="bell" [size]="12" color="var(--ink-3)" />
      </div>
    </aside>
  `,
  styles: [
    `
      .sb {
        background: var(--surface);
        border-right: 1px solid var(--line);
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow-y: auto;
      }

      .sb-brand {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px 16px 20px;
        border-bottom: 1px solid var(--line-soft);
        flex-shrink: 0;
      }
      .sb-brand-mark {
        width: 22px;
        height: 22px;
        background: var(--brand);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
        flex-shrink: 0;
      }
      .sb-brand-name {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.1px;
        color: var(--ink-1);
      }
      .sb-brand-sub {
        font-size: 10px;
        color: var(--ink-3);
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-top: 1px;
      }

      .sb-section-label {
        font-size: 10px;
        color: var(--ink-4);
        text-transform: uppercase;
        letter-spacing: 0.7px;
        padding: 14px 16px 6px;
      }

      .sb-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 7px 16px;
        font-size: 12.5px;
        color: var(--ink-2);
        border-left: 2px solid transparent;
        transition: background 0.12s;
        cursor: pointer;
      }
      .sb-item:hover {
        background: var(--surface-alt);
      }
      .sb-item.active {
        color: var(--ink-1);
        background: var(--surface-alt);
        border-left-color: var(--brand);
        font-weight: 500;
      }

      .sb-foot {
        margin-top: auto;
        padding: 12px 16px;
        border-top: 1px solid var(--line-soft);
        display: flex;
        gap: 8px;
        align-items: center;
        flex-shrink: 0;
      }
      .sb-avatar {
        width: 22px;
        height: 22px;
        background: var(--brand-soft);
        color: var(--brand);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
      }
      .sb-foot-info {
        flex: 1;
        min-width: 0;
      }
      .sb-foot-name {
        font-size: 11.5px;
        color: var(--ink-1);
        font-weight: 500;
      }
      .sb-foot-role {
        font-size: 10px;
        color: var(--ink-4);
      }
    `,
  ],
})
export class SidebarComponent {
  operacao = NAV_ITEMS.slice(0, 4);
  planejamento = NAV_ITEMS.slice(4, 7);
  sistema = NAV_ITEMS.slice(7);
}
