import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Card } from '@caixa-familia/shared-types';
import { environment } from '../../../environments/environment';
import type { CategoryWire, CreateCategoryWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  listCategories(): Observable<CategoryWire[]> {
    return this.http.get<CategoryWire[]>(`${this.base}/categories`);
  }

  listCards(): Observable<Card[]> {
    return this.http.get<Card[]>(`${this.base}/cards`);
  }

  createCategory(body: CreateCategoryWire): Observable<CategoryWire> {
    return this.http.post<CategoryWire>(`${this.base}/categories`, body);
  }
}
