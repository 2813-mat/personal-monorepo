import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { FixedExpenseWire, CreateFixedExpenseWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class FixedApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/fixed-expenses`;

  list(params: { year: number; month: number }): Observable<FixedExpenseWire[]> {
    const hp = new HttpParams().set('year', params.year).set('month', params.month);
    return this.http.get<FixedExpenseWire[]>(this.base, { params: hp });
  }

  create(body: CreateFixedExpenseWire): Observable<FixedExpenseWire> {
    return this.http.post<FixedExpenseWire>(this.base, body);
  }
}
