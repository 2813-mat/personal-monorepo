import { Injectable, computed, signal } from '@angular/core';
import type { HolderFilter } from '@caixa-familia/shared-types';
import { monthContextOf, type MonthView } from '@caixa-familia/shared-utils';

/**
 * Estado de navegação que os stores de recurso consultam: transações e gastos
 * fixos pedem o mês corrente à API. Fica fora deles para não obrigar um a
 * depender do outro.
 */
@Injectable({ providedIn: 'root' })
export class ViewContextService {
  readonly currentMonth = signal<MonthView>(monthContextOf());
  readonly holderFilter = signal<HolderFilter>('todos');
  readonly monthLabel = computed(() => this.currentMonth().label);
}
