import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { InvoiceHistoryWire, OpenInvoiceWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class InvoiceApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /** Todas as faturas fechadas do household, numa chamada só. */
  listAll(): Observable<InvoiceHistoryWire[]> {
    return this.http.get<InvoiceHistoryWire[]>(`${this.base}/cards/invoices`);
  }

  listByCard(cardId: string): Observable<InvoiceHistoryWire[]> {
    return this.http.get<InvoiceHistoryWire[]>(`${this.base}/cards/${cardId}/invoices`);
  }

  getOpen(cardId: string): Observable<OpenInvoiceWire> {
    return this.http.get<OpenInvoiceWire>(`${this.base}/cards/${cardId}/invoice`);
  }

  /**
   * Admin-only no backend. `year`/`month` são as coordenadas do **fechamento**
   * do ciclo, que vêm de `getOpen` — não são o mês navegado na UI.
   */
  closeInvoice(cardId: string, year: number, month: number): Observable<InvoiceHistoryWire> {
    return this.http.post<InvoiceHistoryWire>(`${this.base}/cards/${cardId}/invoices/close`, {
      year,
      month,
    });
  }
}
