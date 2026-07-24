import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { MonthlySummaryWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/reports`;

  listMonthly(): Observable<MonthlySummaryWire[]> {
    return this.http.get<MonthlySummaryWire[]>(`${this.base}/monthly`);
  }

  /** Admin-only no backend. */
  closeMonth(year: number, month: number): Observable<MonthlySummaryWire> {
    return this.http.post<MonthlySummaryWire>(`${this.base}/monthly/close`, { year, month });
  }
}
