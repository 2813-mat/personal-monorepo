import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { GoalWire, CreateContributionWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class GoalApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/goals`;

  list(): Observable<GoalWire[]> {
    return this.http.get<GoalWire[]>(this.base);
  }

  addContribution(slug: string, body: CreateContributionWire): Observable<void> {
    return this.http.post<void>(`${this.base}/${slug}/contributions`, body);
  }
}
