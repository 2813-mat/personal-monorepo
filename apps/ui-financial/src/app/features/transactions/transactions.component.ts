import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { CardChipComponent } from '../../ui/card-chip/card-chip.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { TxDetailDrawerComponent } from '../tx-detail-drawer/tx-detail-drawer.component';
import type { Transaction } from '@caixa-familia/shared-types';

const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

type SortCol = 'date' | 'value' | null;
type SortDir = 'asc' | 'desc';

interface TxGroup {
  catId: string;
  catLabel: string;
  items: Transaction[];
  total: number;
}

@Component({
  selector: 'cf-transactions',
  standalone: true,
  imports: [
    FormsModule,
    NgTemplateOutlet,
    MoneyComponent,
    AvatarComponent,
    CatDotComponent,
    CardChipComponent,
    ProgressBarComponent,
    IconComponent,
    TxDetailDrawerComponent,
  ],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss',
})
export class TransactionsComponent {
  protected data = inject(AppDataService);

  searchQuery = signal('');
  selectedTx = signal<Transaction | null>(null);
  selectedCat = signal<string | null>(null);
  sortCol = signal<SortCol>('date');
  sortDir = signal<SortDir>('desc');
  groupMode = signal<'category' | 'date'>('category');

  private filteredTx = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const cat = this.selectedCat();
    const filter = this.data.holderFilter();
    return this.data.transactions()
      .filter(t => filter === 'todos' || t.holder === filter || (filter !== 'shared' && t.holder === 'shared'))
      .filter(t => !cat || t.cat === cat)
      .filter(t => !query || t.label.toLowerCase().includes(query));
  });

  flatSorted = computed(() => {
    const col = this.sortCol();
    const dir = this.sortDir();
    return [...this.filteredTx()].sort((a, b) => {
      let cmp = 0;
      if (col === 'date') cmp = a.date.localeCompare(b.date);
      else if (col === 'value') cmp = a.value - b.value;
      return dir === 'asc' ? cmp : -cmp;
    });
  });

  // Itens dentro de cada grupo respeitam sortCol/sortDir (flatSorted já vem ordenado).
  // Grupos em si ficam sempre por total desc — comportamento intencional.
  groupedByCategory = computed((): TxGroup[] => {
    const groups: Record<string, Transaction[]> = {};
    for (const t of this.flatSorted()) {
      if (!groups[t.cat]) groups[t.cat] = [];
      groups[t.cat].push(t);
    }
    return Object.entries(groups)
      .map(([catId, items]) => ({
        catId,
        catLabel: this.data.catBy()[catId]?.label ?? catId,
        items,
        total: items.reduce((s, t) => s + t.value, 0),
      }))
      .sort((a, b) => b.total - a.total);
  });

  filteredCount = computed(() => this.filteredTx().length);

  totalAll = computed(() => this.filteredTx().reduce((s, t) => s + t.value, 0));
  totalMateus = computed(() => this.data.transactions().filter(t => t.holder === 'Mateus').reduce((s, t) => s + t.value, 0));
  totalThais = computed(() => this.data.transactions().filter(t => t.holder === 'Thais').reduce((s, t) => s + t.value, 0));
  totalShared = computed(() => this.data.transactions().filter(t => t.holder === 'shared').reduce((s, t) => s + t.value, 0));

  toggleSort(col: SortCol) {
    if (this.sortCol() === col) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortCol.set(col);
      this.sortDir.set('desc');
    }
  }

  sortIcon(col: SortCol): string {
    if (this.sortCol() !== col) return 'arrowDown';
    return this.sortDir() === 'asc' ? 'arrowUp' : 'arrowDown';
  }

  formatDate(date: string): string {
    const d = new Date(date + 'T12:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${MONTHS[d.getMonth()]}`;
  }

  catLabel(catId: string): string {
    return this.data.catBy()[catId]?.label ?? catId;
  }

  cardOf(method: string) {
    return this.data.cardBy()[method] ?? null;
  }
}
