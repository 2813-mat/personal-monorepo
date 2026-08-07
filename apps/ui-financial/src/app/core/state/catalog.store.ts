import { Injectable, computed, inject, signal } from '@angular/core';
import type { Card, Category } from '@caixa-familia/shared-types';
import { CatalogApiService } from '../api/catalog-api.service';
import {
  wireToCategory,
  categoryToCreateWire,
  categoryToUpdateWire,
} from '../api/catalog.mapper';
import { categoryConflictMessage } from '../api/category-conflict';
import { FailureReporter } from './failure.reporter';

@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private api = inject(CatalogApiService);
  private failure = inject(FailureReporter);

  readonly categories = signal<Category[]>([]);
  readonly cards = signal<Card[]>([]);

  readonly categoriesError = signal<string | null>(null);
  readonly cardsError = signal<string | null>(null);

  readonly catBy = computed<Record<string, Category>>(() =>
    Object.fromEntries(this.categories().map((c) => [c.id, c])),
  );
  readonly cardBy = computed<Record<string, Card>>(() =>
    Object.fromEntries(this.cards().map((c) => [c.id, c])),
  );

  load(): void {
    this.categoriesError.set(null);
    this.cardsError.set(null);
    this.api.listCategories().subscribe({
      next: (rows) => this.categories.set(rows.map(wireToCategory)),
      error: () => this.failure.report('Falha ao carregar categorias', this.categoriesError),
    });
    this.api.listCards().subscribe({
      next: (rows) => this.cards.set(rows),
      error: () => this.failure.report('Falha ao carregar cartões', this.cardsError),
    });
  }

  createCategory(c: Category): void {
    this.api.createCategory(categoryToCreateWire(c)).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao criar categoria', this.categoriesError),
    });
  }

  updateCategory(c: Category): void {
    this.api.updateCategory(c.id, categoryToUpdateWire(c)).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao salvar categoria', this.categoriesError),
    });
  }

  removeCategory(slug: string): void {
    this.api.removeCategory(slug).subscribe({
      next: () => this.load(),
      error: (err) => this.failure.report(categoryConflictMessage(err), this.categoriesError),
    });
  }

  /** Adota a lista da resposta, não o estado otimista: duas abas não divergem. */
  reorderCategories(slugs: string[]): void {
    this.api.reorderCategories(slugs).subscribe({
      next: (rows) => this.categories.set(rows.map(wireToCategory)),
      error: () => this.failure.report('Falha ao reordenar categorias', this.categoriesError),
    });
  }
}
