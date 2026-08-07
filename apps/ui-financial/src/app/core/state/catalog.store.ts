import { Injectable, computed, inject, signal } from '@angular/core';
import type { Card, Category } from '@caixa-familia/shared-types';
import { CatalogApiService } from '../api/catalog-api.service';
import {
  wireToCategory,
  categoryToCreateWire,
  categoryToUpdateWire,
} from '../api/catalog.mapper';
import { categoryConflictMessage } from '../api/category-conflict';
import { cardConflictMessage } from '../api/card-conflict';
import { cardToCreateWire, cardToUpdateWire, type NewCard } from '../api/card.mapper';
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

  /** Cartão arquivado sai dos seletores, mas continua em `cards` e no `cardBy`. */
  readonly activeCards = computed(() => this.cards().filter((c) => !c.archived));

  /**
   * Mensagem do 409 do DELETE. Não vira toast: a tela usa isto para abrir o
   * modal que oferece arquivar, transformando o erro em caminho de saída.
   */
  readonly cardRemovalConflict = signal<string | null>(null);

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

  createCard(c: NewCard): void {
    this.api.createCard(cardToCreateWire(c)).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao criar cartão', this.cardsError),
    });
  }

  updateCard(c: Card): void {
    this.api.updateCard(c.id, cardToUpdateWire(c)).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao salvar cartão', this.cardsError),
    });
  }

  removeCard(id: string): void {
    this.cardRemovalConflict.set(null);
    this.api.removeCard(id).subscribe({
      next: () => this.load(),
      error: (err) => {
        if (err.status === 409) this.cardRemovalConflict.set(cardConflictMessage(err));
        else this.failure.report('Falha ao excluir cartão', this.cardsError);
      },
    });
  }

  archiveCard(id: string, archived: boolean): void {
    this.api.archiveCard(id, archived).subscribe({
      next: () => this.load(),
      error: () =>
        this.failure.report(
          archived ? 'Falha ao arquivar cartão' : 'Falha ao desarquivar cartão',
          this.cardsError,
        ),
    });
  }

  clearCardRemovalConflict(): void {
    this.cardRemovalConflict.set(null);
  }

  /** Adota a lista da resposta, não o estado otimista: duas abas não divergem. */
  reorderCategories(slugs: string[]): void {
    this.api.reorderCategories(slugs).subscribe({
      next: (rows) => this.categories.set(rows.map(wireToCategory)),
      error: () => this.failure.report('Falha ao reordenar categorias', this.categoriesError),
    });
  }
}
