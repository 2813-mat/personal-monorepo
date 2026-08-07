import { Injectable, inject, signal } from '@angular/core';
import { InvoiceApiService } from '../api/invoice-api.service';
import {
  wireToInvoiceHistory,
  wireToOpenInvoiceItem,
  groupInvoiceHistoryByCard,
  type InvoiceHistoryEntry,
  type OpenInvoiceState,
} from '../api/invoice.mapper';
import { FailureReporter } from './failure.reporter';

@Injectable({ providedIn: 'root' })
export class InvoiceStore {
  private api = inject(InvoiceApiService);
  private failure = inject(FailureReporter);

  /** Faturas fechadas de todos os cartões, por cartão — alimenta a tabela de cartões. */
  readonly historyByCard = signal<Record<string, InvoiceHistoryEntry[]>>({});

  readonly history = signal<InvoiceHistoryEntry[]>([]);
  readonly historyLoading = signal(false);
  readonly historyError = signal<string | null>(null);

  readonly open = signal<OpenInvoiceState>({
    total: 0,
    items: [],
    closingDate: '',
    year: 0,
    month: 0,
  });
  readonly openLoading = signal(false);
  readonly openError = signal<string | null>(null);

  /**
   * Fatura aberta de um cartão, pelo ciclo de faturamento real. Não deriva de
   * `transactions()`: um ciclo atravessa dois meses-calendário e a UI só carrega
   * um mês por vez, então o client não teria os dados para acertar.
   */
  loadOpen(cardId: string): void {
    this.openLoading.set(true);
    this.openError.set(null);
    this.api.getOpen(cardId).subscribe({
      next: (wire) => {
        this.open.set({
          total: wire.total,
          items: wire.items.map(wireToOpenInvoiceItem),
          closingDate: wire.closingDate,
          year: wire.year,
          month: wire.month,
        });
        this.openLoading.set(false);
      },
      error: () => {
        this.failure.report('Falha ao carregar a fatura', this.openError);
        this.openLoading.set(false);
      },
    });
  }

  /**
   * Histórico de todos os cartões numa chamada. Sem dimensão de mês: carrega no
   * login, junto do catálogo.
   */
  loadAllHistory(): void {
    this.api.listAll().subscribe({
      next: (rows) => this.historyByCard.set(groupInvoiceHistoryByCard(rows)),
      error: () =>
        this.failure.report('Falha ao carregar o histórico de faturas', this.historyError),
    });
  }

  /**
   * Histórico de faturas fechadas de um cartão. Disparado pela tela de fatura,
   * que é quem conhece o cartão da rota — não entra nos effects do shell.
   */
  loadHistory(cardId: string): void {
    this.historyLoading.set(true);
    this.historyError.set(null);
    this.api.listByCard(cardId).subscribe({
      next: (rows) => {
        this.history.set(rows.map(wireToInvoiceHistory));
        this.historyLoading.set(false);
      },
      error: () => {
        this.failure.report('Falha ao carregar o histórico de faturas', this.historyError);
        this.historyLoading.set(false);
      },
    });
  }

  /**
   * Fecha a fatura de um cartão (admin). `year`/`month` são as coordenadas do
   * **fechamento** do ciclo, que vêm de `open()` — não use o mês corrente.
   */
  close(cardId: string, year: number, month: number): void {
    this.api.closeInvoice(cardId, year, month).subscribe({
      next: () => {
        this.loadHistory(cardId);
        this.loadOpen(cardId);
      },
      error: () => this.failure.report('Falha ao fechar a fatura', this.historyError),
    });
  }
}
