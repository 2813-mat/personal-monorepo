import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { IncomeWire, CreateIncomeWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class IncomeApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/incomes`;

  list(): Observable<IncomeWire[]> {
    return this.http.get<IncomeWire[]>(this.base);
  }

  create(body: CreateIncomeWire): Observable<IncomeWire> {
    return this.http.post<IncomeWire>(this.base, body);
  }
}
