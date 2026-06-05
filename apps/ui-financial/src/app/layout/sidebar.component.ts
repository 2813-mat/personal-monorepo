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
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  operacao = NAV_ITEMS.slice(0, 4);
  planejamento = NAV_ITEMS.slice(4, 7);
  sistema = NAV_ITEMS.slice(7);
}
