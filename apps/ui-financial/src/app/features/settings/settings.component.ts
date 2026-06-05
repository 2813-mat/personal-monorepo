import { Component, inject, computed, signal } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import type { Holder } from '@caixa-familia/shared-types';

type SectionId = 'cats' | 'people' | 'cards' | 'rules' | 'import' | 'notif' | 'backup';

interface NavItem {
  id: SectionId;
  label: string;
  icon: string;
}

interface Person {
  name: Holder;
  email: string;
  role: string;
  tag: string;
}

@Component({
  selector: 'cf-settings',
  standalone: true,
  imports: [MoneyComponent, CatDotComponent, AvatarComponent, IconComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  protected data = inject(AppDataService);

  protected activeSection = signal<SectionId>('cats');

  protected navItems: NavItem[] = [
    { id: 'cats',   label: 'Categorias',     icon: 'target' },
    { id: 'people', label: 'Pessoas',        icon: 'list' },
    { id: 'cards',  label: 'Cartões',        icon: 'card' },
    { id: 'rules',  label: 'Recorrências',   icon: 'repeat' },
    { id: 'import', label: 'Importar',       icon: 'upload' },
    { id: 'notif',  label: 'Notificações',   icon: 'bell' },
    { id: 'backup', label: 'Backup',         icon: 'download' },
  ];

  protected people: Person[] = [
    { name: 'Mateus', email: 'mateus@email.com', role: 'Admin',  tag: '#1F4E79' },
    { name: 'Thais',  email: 'thais@email.com',  role: 'Editor', tag: '#7A1F3D' },
  ];

  protected totalBudget = computed(() =>
    this.data.categories().reduce((s, c) => s + c.budget, 0)
  );

  protected totalLimit = computed(() =>
    this.data.cards().reduce((s, c) => s + c.limit, 0)
  );

  protected catTxCount(catId: string): number {
    return this.data.transactions().filter(t => t.cat === catId).length;
  }

  protected personTxCount(name: Holder): number {
    return this.data.transactions().filter(t => t.holder === name).length;
  }

  protected bankTag(bank: string): string {
    return bank.slice(0, 4).toUpperCase();
  }

  protected formatNum(value: number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);
  }
}
