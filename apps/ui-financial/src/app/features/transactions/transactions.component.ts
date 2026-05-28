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
  ],
  template: `
    <!-- Sub-header KPI + filter strip -->
    <div class="strip">
      <div class="strip-kpis">
        <div class="kpi-item">
          <div class="kpi-label">Total</div>
          <cf-money [value]="totalAll()" [negColor]="false" />
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item">
          <div class="kpi-label">Mateus</div>
          <cf-money [value]="totalMateus()" [negColor]="false" />
        </div>
        <div class="kpi-item">
          <div class="kpi-label">Thais</div>
          <cf-money [value]="totalThais()" [negColor]="false" />
        </div>
        <div class="kpi-item">
          <div class="kpi-label">Compartilhado</div>
          <cf-money [value]="totalShared()" [negColor]="false" />
        </div>
      </div>
      <div class="strip-filters">
        <!-- Category filter -->
        <div class="filter-chips">
          <button class="filter-chip" [class.active]="!selectedCat()" (click)="selectedCat.set(null)">
            Todas
          </button>
          @for (cat of data.categories(); track cat.id) {
            <button
              class="filter-chip"
              [class.active]="selectedCat() === cat.id"
              (click)="selectedCat.set(cat.id)"
            >
              <cf-cat-dot [catId]="cat.id" [size]="6" />
              {{ cat.label }}
            </button>
          }
        </div>
        <!-- Search -->
        <div class="search-box">
          <cf-icon name="search" [size]="11" color="var(--ink-4)" />
          <input
            class="search-input"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Buscar lançamento…"
          />
        </div>
        <button class="action-btn">
          <cf-icon name="download" [size]="11" /> Exportar
        </button>
      </div>
    </div>

    <!-- Table card -->
    <div class="table-card">
      <div class="table-head">
        <span class="table-title">Lançamentos · {{ filteredCount() }}</span>
        <div class="group-seg">
          <span class="seg-label">Agrupar:</span>
          <div class="seg">
            <button class="seg-btn" [class.active]="groupMode() === 'date'" (click)="groupMode.set('date')">Data</button>
            <button class="seg-btn" [class.active]="groupMode() === 'category'" (click)="groupMode.set('category')">Categoria</button>
          </div>
        </div>
      </div>

      <div class="table-scroll">
        <table class="tx-table">
          <thead>
            <tr>
              <th style="width:18px"></th>
              <th class="sortable" style="width:80px" (click)="toggleSort('date')">
                Data <cf-icon [name]="sortIcon('date')" [size]="9" color="var(--ink-3)" />
              </th>
              <th>Descrição</th>
              <th style="width:130px">Categoria</th>
              <th style="width:130px">Método</th>
              <th style="width:60px">Quem</th>
              <th style="width:100px">Parcela</th>
              <th class="r sortable" style="width:110px" (click)="toggleSort('value')">
                Valor <cf-icon [name]="sortIcon('value')" [size]="9" color="var(--ink-3)" />
              </th>
            </tr>
          </thead>
          <tbody>
            @if (groupMode() === 'category') {
              @for (group of groupedByCategory(); track group.catId) {
                <tr class="group-row">
                  <td colspan="7" class="group-cell">
                    <cf-cat-dot [catId]="group.catId" [size]="8" />
                    <span class="group-label">{{ group.catLabel }}</span>
                    <span class="group-count">· {{ group.items.length }} itens</span>
                  </td>
                  <td class="r group-total">
                    <cf-money [value]="group.total" [negColor]="false" size="sm" />
                  </td>
                </tr>
                @for (tx of group.items; track tx.id) {
                  <ng-container *ngTemplateOutlet="txRow; context: { $implicit: tx }" />
                }
              }
            } @else {
              @for (tx of flatSorted(); track tx.id) {
                <ng-container *ngTemplateOutlet="txRow; context: { $implicit: tx }" />
              }
            }

            @if (filteredCount() === 0) {
              <tr>
                <td colspan="8" class="empty-cell">Nenhuma transação encontrada</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="table-foot">
        <span>Mostrando {{ filteredCount() }} lançamentos</span>
        <span class="table-foot-total num">
          Total: <cf-money [value]="totalAll()" [negColor]="false" size="sm" />
        </span>
      </div>
    </div>

    <!-- Row template -->
    <ng-template #txRow let-tx>
      <tr class="tx-row">
        <td><input type="checkbox" class="tx-check" /></td>
        <td class="tx-date num">{{ formatDate(tx.date) }}</td>
        <td>
          <div class="desc-cell">
            <span class="desc-label">{{ tx.label }}</span>
            @if (tx.recurring) {
              <span class="pill-fixed">
                <cf-icon name="repeat" [size]="9" /> fixo
              </span>
            }
          </div>
        </td>
        <td class="tx-cat">{{ catLabel(tx.cat) }}</td>
        <td>
          @if (cardOf(tx.method)) {
            <div class="method-cell">
              <cf-card-chip [cardId]="tx.method" size="sm" />
              <span class="method-last4">···{{ cardOf(tx.method)!.last4 }}</span>
            </div>
          } @else {
            <div class="method-cell">
              <cf-icon name="pix" [size]="11" color="var(--ink-3)" />
              <span class="method-label">Pix</span>
            </div>
          }
        </td>
        <td>
          @if (tx.holder !== 'shared') {
            <cf-avatar [holder]="tx.holder" [size]="18" />
          } @else {
            <div class="shared-avatars">
              <cf-avatar holder="Mateus" [size]="15" />
              <cf-avatar holder="Thais"  [size]="15" />
            </div>
          }
        </td>
        <td>
          @if (tx.installments) {
            <div class="installment-cell">
              <span class="inst-label num">{{ tx.installments.n }}/{{ tx.installments.of }}</span>
              <cf-progress-bar
                [value]="tx.installments.n"
                [max]="tx.installments.of"
                [height]="2"
              />
            </div>
          } @else {
            <span class="tx-avista">À vista</span>
          }
        </td>
        <td class="r num tx-value">
          <cf-money [value]="tx.value" [negColor]="false" />
        </td>
      </tr>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }

    /* Strip */
    .strip {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
      padding: 10px 14px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .strip-kpis { display: flex; align-items: center; gap: 0; }
    .kpi-item { display: flex; flex-direction: column; gap: 2px; padding-right: 16px; }
    .kpi-divider { width: 1px; height: 28px; background: var(--line); margin-right: 16px; }
    .kpi-label {
      font-size: 10.5px; color: var(--ink-3);
      text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600;
    }

    .strip-filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .filter-chips { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; min-width: 0; }
    .filter-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 8px; font-size: 11px; color: var(--ink-2);
      border: 1px solid var(--line); background: var(--surface);
      cursor: pointer;
    }
    .filter-chip:hover { background: var(--surface-alt); }
    .filter-chip.active { background: var(--ink-1); color: #fff; border-color: var(--ink-1); }

    .search-box {
      display: flex; align-items: center; gap: 6px;
      height: 26px; padding: 0 10px;
      border: 1px solid var(--line); background: var(--surface-alt);
      min-width: 180px;
    }
    .search-input {
      border: none; background: none; outline: none;
      font-size: 12px; color: var(--ink-2); font-family: inherit;
      width: 100%;
    }

    .action-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 0 10px; height: 26px;
      font-size: 12px; color: var(--ink-1);
      border: 1px solid var(--line); background: var(--surface);
      cursor: pointer;
    }
    .action-btn:hover { background: var(--surface-alt); }

    /* Table card */
    .table-card {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
    }
    .table-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px 8px;
      border-bottom: 1px solid var(--line-soft);
    }
    .table-title {
      font-size: 11px; color: var(--ink-3);
      text-transform: uppercase; letter-spacing: 0.7px; font-weight: 600;
    }
    .group-seg { display: flex; align-items: center; gap: 8px; }
    .seg-label { font-size: 11px; color: var(--ink-4); }
    .seg { display: inline-flex; border: 1px solid var(--line); height: 22px; }
    .seg-btn {
      padding: 0 8px; font-size: 11px; color: var(--ink-2);
      border-right: 1px solid var(--line); background: none;
      border-top: 0; border-bottom: 0; border-left: 0; cursor: pointer;
    }
    .seg-btn:last-child { border-right: 0; }
    .seg-btn.active { background: var(--ink-1); color: #fff; }

    .table-scroll { overflow-x: auto; }

    /* Table */
    .tx-table {
      width: 100%; border-collapse: collapse; font-size: 12.5px;
    }
    .tx-table thead th {
      text-align: left;
      font-size: 10.5px; font-weight: 600; color: var(--ink-3);
      text-transform: uppercase; letter-spacing: 0.5px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--line);
      background: var(--surface-sunk);
      white-space: nowrap;
      position: sticky; top: 0; z-index: 1;
    }
    .tx-table thead th.r { text-align: right; }
    .tx-table thead th.sortable { cursor: pointer; user-select: none; }
    .tx-table thead th.sortable:hover { color: var(--ink-1); }

    /* Group rows */
    .group-row { background: var(--surface-sunk); }
    .group-cell {
      padding: 7px 12px;
      display: flex; align-items: center; gap: 6px;
    }
    .group-label {
      font-size: 10.5px; font-weight: 600; color: var(--ink-3);
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .group-count { font-size: 11px; color: var(--ink-4); }
    .group-total { padding: 7px 12px; }

    /* TX rows */
    .tx-row td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--line-soft);
      color: var(--ink-2);
      vertical-align: middle;
    }
    .tx-row:hover td { background: var(--surface-alt); }
    .r { text-align: right; }

    .tx-check { accent-color: var(--brand); }
    .tx-date { color: var(--ink-4); font-size: 11px; }
    .tx-cat { color: var(--ink-4); font-size: 11px; }
    .tx-avista { color: var(--ink-4); font-size: 11px; }
    .tx-value { color: var(--ink-1); }

    .desc-cell { display: flex; align-items: center; gap: 6px; }
    .desc-label { color: var(--ink-1); }
    .pill-fixed {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 10px; font-weight: 500;
      padding: 1px 5px;
      background: var(--surface-alt); border: 1px solid var(--line); color: var(--ink-3);
      text-transform: uppercase; letter-spacing: 0.4px;
    }

    .method-cell { display: flex; align-items: center; gap: 6px; }
    .method-last4, .method-label { font-size: 11px; color: var(--ink-4); }

    .shared-avatars {
      display: flex;
      align-items: center;
    }
    .shared-avatars cf-avatar:last-child {
      margin-left: -5px;
      opacity: 0.85;
    }

    .installment-cell { display: flex; flex-direction: column; gap: 2px; width: 72px; }
    .inst-label { font-size: 11px; color: var(--ink-4); }

    .empty-cell {
      padding: 32px 12px; text-align: center;
      color: var(--ink-4); font-size: 13px;
    }

    .table-foot {
      display: flex; justify-content: space-between;
      padding: 8px 14px;
      border-top: 1px solid var(--line-soft);
      font-size: 11px; color: var(--ink-3);
    }
    .table-foot-total { color: var(--ink-1); font-weight: 600; }
  `],
})
export class TransactionsComponent {
  protected data = inject(AppDataService);

  searchQuery = signal('');
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
