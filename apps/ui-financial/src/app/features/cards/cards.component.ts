import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { SparkbarsComponent } from '../../ui/sparkbars/sparkbars.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { daysUntilClosing } from '@caixa-familia/shared-utils';
import type { Card } from '@caixa-familia/shared-types';

type SortMode = 'closing' | 'value' | 'holder';

// Gera histórico mock determinístico por cartão (6 meses)
function cardHistory(card: Card): number[] {
  const seed = card.id.charCodeAt(0) + card.id.charCodeAt(1);
  return Array.from({ length: 6 }, (_, i) => {
    const v = card.current * (0.55 + ((seed + i * 11) % 80) / 100);
    return Math.round(v);
  });
}

// Dias até o próximo vencimento (due date) a partir de hoje
function daysUntilDue(card: Card, ref: Date): number {
  const due = new Date(ref.getFullYear(), ref.getMonth(), card.due);
  if (ref.getDate() >= card.due) {
    due.setMonth(due.getMonth() + 1);
  }
  return Math.ceil((due.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
}

const FUTURE_MONTHS = [
  'Jun/26',
  'Jul/26',
  'Ago/26',
  'Set/26',
  'Out/26',
  'Nov/26',
];

@Component({
  selector: 'cf-cards',
  standalone: true,
  imports: [
    MoneyComponent,
    AvatarComponent,
    ProgressBarComponent,
    SparkbarsComponent,
    IconComponent,
    RouterLink,
  ],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.scss',
})
export class CardsComponent {
  protected data = inject(AppDataService);

  sortMode = signal<SortMode>('closing');

  private today = new Date();

  // ── KPI computeds ─────────────────────────────────────────────────────────

  totalOpen = computed(() =>
    this.data.cards().reduce((s, c) => s + c.current, 0),
  );
  totalLimit = computed(() =>
    this.data.cards().reduce((s, c) => s + c.limit, 0),
  );

  utilizationPct = computed(() =>
    this.totalLimit() > 0
      ? Math.round((this.totalOpen() / this.totalLimit()) * 100)
      : 0,
  );

  mateusCount = computed(
    () => this.data.cards().filter((c) => c.holder === 'Mateus').length,
  );
  thaisCount = computed(
    () => this.data.cards().filter((c) => c.holder === 'Thais').length,
  );

  closingSoon = computed(
    () =>
      this.data.cards().filter((c) => daysUntilClosing(c, this.today) <= 7)
        .length,
  );

  nextDueCard = computed(() => {
    return (
      [...this.data.cards()].sort(
        (a, b) => daysUntilDue(a, this.today) - daysUntilDue(b, this.today),
      )[0] ?? null
    );
  });

  nextDueLabel = computed(() => {
    const card = this.nextDueCard();
    if (!card) return '—';
    const days = daysUntilDue(card, this.today);
    const d = new Date(this.today.getTime() + days * 86_400_000);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  });

  // ── Table ─────────────────────────────────────────────────────────────────

  sortedCards = computed(() => {
    const cards = [...this.data.cards()];
    switch (this.sortMode()) {
      case 'closing':
        return cards.sort(
          (a, b) =>
            daysUntilClosing(a, this.today) - daysUntilClosing(b, this.today),
        );
      case 'value':
        return cards.sort((a, b) => b.current - a.current);
      case 'holder':
        return cards.sort((a, b) => a.holder.localeCompare(b.holder));
    }
  });

  private cardActivity = computed(() => {
    const act = new Set<string>();
    for (const t of this.data.transactions()) {
      if (this.data.cardBy()[t.method]) act.add(t.method);
    }
    return act;
  });

  // ── Compromissos futuros ──────────────────────────────────────────────────

  futureMonths = computed(() => {
    const installmentTx = this.data
      .transactions()
      .filter((t) => t.installments !== null);

    return FUTURE_MONTHS.map((label, monthOffset) => {
      // monthOffset 0 = Jun/26, 1 = Jul/26, etc. (current = May = offset -1)
      const futureMonthIndex = monthOffset + 1; // parcelas que ainda faltam: >= futureMonthIndex
      let total = 0;
      let count = 0;
      for (const tx of installmentTx) {
        const inst = tx.installments;
        if (!inst) continue;
        const remaining = inst.of - inst.n;
        if (remaining >= futureMonthIndex) {
          total += tx.value;
          count++;
        }
      }
      return { label, total, count, isFirst: monthOffset === 0 };
    });
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  daysLeft(card: Card) {
    return daysUntilClosing(card, this.today);
  }
  utilPct(card: Card) {
    return Math.round((card.current / card.limit) * 100);
  }
  historyOf(card: Card) {
    return cardHistory(card);
  }
  hasActivity(cardId: string) {
    return this.cardActivity().has(cardId);
  }
  fmtShort(v: number) {
    return v.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
}
