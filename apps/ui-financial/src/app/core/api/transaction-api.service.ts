import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { TransactionWire, CreateTransactionWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class TransactionApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/transactions`;

  list(params: { year: number; month: number; holder?: string }): Observable<TransactionWire[]> {
    let hp = new HttpParams().set('year', params.year).set('month', params.month);
    if (params.holder && params.holder !== 'todos') hp = hp.set('holder', params.holder);
    return this.http.get<TransactionWire[]>(this.base, { params: hp });
  }

  create(body: CreateTransactionWire): Observable<TransactionWire> {
    return this.http.post<TransactionWire>(this.base, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
