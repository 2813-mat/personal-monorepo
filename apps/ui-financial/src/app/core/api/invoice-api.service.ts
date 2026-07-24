import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { InvoiceHistoryWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class InvoiceApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  listByCard(cardId: string): Observable<InvoiceHistoryWire[]> {
    return this.http.get<InvoiceHistoryWire[]>(`${this.base}/cards/${cardId}/invoices`);
  }
}
