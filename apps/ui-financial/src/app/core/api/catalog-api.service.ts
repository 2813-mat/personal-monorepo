import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Card } from '@caixa-familia/shared-types';
import { environment } from '../../../environments/environment';
import type {
  CategoryWire,
  CreateCategoryWire,
  UpdateCategoryWire,
  CreateCardWire,
  UpdateCardWire,
} from './wire.types';

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

  updateCategory(slug: string, body: UpdateCategoryWire): Observable<CategoryWire> {
    return this.http.patch<CategoryWire>(`${this.base}/categories/${slug}`, body);
  }

  removeCategory(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/${slug}`);
  }

  reorderCategories(slugs: string[]): Observable<CategoryWire[]> {
    return this.http.patch<CategoryWire[]>(`${this.base}/categories/order`, { slugs });
  }

  createCard(body: CreateCardWire): Observable<Card> {
    return this.http.post<Card>(`${this.base}/cards`, body);
  }

  updateCard(id: string, body: UpdateCardWire): Observable<Card> {
    return this.http.patch<Card>(`${this.base}/cards/${id}`, body);
  }

  removeCard(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/cards/${id}`);
  }

  archiveCard(id: string, archived: boolean): Observable<Card> {
    return this.http.patch<Card>(`${this.base}/cards/${id}/archive`, { archived });
  }
}
