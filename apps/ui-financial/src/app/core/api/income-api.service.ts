import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  IncomeWire,
  CreateIncomeWire,
  UpdateIncomeWire,
  RecurringIncomeWire,
  CreateRecurringIncomeWire,
  UpdateRecurringIncomeWire,
} from './wire.types';

@Injectable({ providedIn: 'root' })
export class IncomeApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/incomes`;

  /** Sem ano/mês o backend devolve o histórico inteiro. */
  list(params?: { year: number; month: number }): Observable<IncomeWire[]> {
    const options = params
      ? { params: new HttpParams().set('year', params.year).set('month', params.month) }
      : {};
    return this.http.get<IncomeWire[]>(this.base, options);
  }

  create(body: CreateIncomeWire): Observable<IncomeWire> {
    return this.http.post<IncomeWire>(this.base, body);
  }

  update(id: string, body: UpdateIncomeWire): Observable<IncomeWire> {
    return this.http.patch<IncomeWire>(`${this.base}/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class RecurringIncomeApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/recurring-incomes`;

  list(): Observable<RecurringIncomeWire[]> {
    return this.http.get<RecurringIncomeWire[]>(this.base);
  }

  create(body: CreateRecurringIncomeWire): Observable<RecurringIncomeWire> {
    return this.http.post<RecurringIncomeWire>(this.base, body);
  }

  update(id: string, body: UpdateRecurringIncomeWire): Observable<RecurringIncomeWire> {
    return this.http.patch<RecurringIncomeWire>(`${this.base}/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
