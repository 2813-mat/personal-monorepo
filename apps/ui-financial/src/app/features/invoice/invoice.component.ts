import { Component, inject, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { SparkbarsComponent } from '../../ui/sparkbars/sparkbars.component';
import { DonutComponent, type DonutSegment } from '../../ui/donut/donut.component';
import { IconComponent } from '../../ui/icon/icon.component';
import type { Transaction } from '@caixa-familia/shared-types';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

interface CatBreakdown {
  catId: string;
  label: string;
  color: string;
  total: number;
}

interface FutureInstallment {
  txId: string;
  label: string;
  k: number;
  of: number;
  monthLabel: string;
  value: number;
}

@Component({
  selector: 'cf-invoice',
  standalone: true,
  imports: [
    MoneyComponent,
    AvatarComponent,
    CatDotComponent,
    ProgressBarComponent,
    SparkbarsComponent,
    DonutComponent,
    IconComponent,
  ],
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss',
})
export class InvoiceComponent {
  protected data = inject(AppDataService);
  private route = inject(ActivatedRoute);

  private cardId = this.route.snapshot.params['cardId'] as string;

  card = computed(() => this.data.cardBy()[this.cardId]);

  // Purchases on this invoice, newest first.
  items = computed((): Transaction[] =>
    this.data.transactions()
      .filter(t => t.method === this.cardId)
      .sort((a, b) => b.date.localeCompare(a.date))
  );

  total = computed(() => this.items().reduce((s, t) => s + t.value, 0));

  // Category breakdown, descending by total.
  breakdown = computed((): CatBreakdown[] => {
    const sums: Record<string, number> = {};
    for (const t of this.items()) {
      sums[t.cat] = (sums[t.cat] ?? 0) + t.value;
    }
    const catBy = this.data.catBy();
    return Object.entries(sums)
      .map(([catId, totalVal]) => ({
        catId,
        label: catBy[catId]?.label ?? catId,
        color: catBy[catId]?.color ?? '#9CA3AF',
        total: totalVal,
      }))
      .sort((a, b) => b.total - a.total);
  });

  donutSegments = computed((): DonutSegment[] =>
    this.breakdown().map(b => ({ value: b.total, color: b.color, label: b.label }))
  );

  // Synthetic 9-month history (no per-card history stored): card.current ±20%,
  // seeded from the card id char codes so it's stable; last entry == current.
  history = computed((): number[] => {
    const c = this.card();
    if (!c) return [];
    const seed = this.cardId.charCodeAt(0) + (this.cardId.charCodeAt(1) || 0);
    return Array.from({ length: 9 }, (_, i) =>
      i === 8 ? c.current : Math.round(c.current * (0.8 + ((seed + i * 13) % 40) / 100))
    );
  });

  histAvg = computed(() => {
    const h = this.history();
    if (h.length === 0) return 0;
    return h.reduce((s, v) => s + v, 0) / h.length;
  });
  histMax = computed(() => (this.history().length ? Math.max(...this.history()) : 0));
  histMin = computed(() => (this.history().length ? Math.min(...this.history()) : 0));

  // Remaining installments projected forward month-by-month from currentMonth().
  futureInstallments = computed((): FutureInstallment[] => {
    const { year, month } = this.data.currentMonth();
    const out: FutureInstallment[] = [];
    for (const tx of this.items()) {
      const inst = tx.installments;
      if (!inst || inst.n >= inst.of) continue;
      for (let k = inst.n + 1; k <= inst.of; k++) {
        // offset 1 = month after current, etc.
        const offset = k - inst.n;
        const d = new Date(year, (month - 1) + offset, 1);
        const monthLabel = `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
        out.push({ txId: tx.id, label: tx.label, k, of: inst.of, monthLabel, value: tx.value });
      }
    }
    return out;
  });

  futureTotal = computed(() => this.futureInstallments().reduce((s, f) => s + f.value, 0));

  fmtDate(date: string): string {
    const d = new Date(date + 'T12:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${MONTHS[d.getMonth()]}`;
  }

  catLabel(catId: string): string {
    return this.data.catBy()[catId]?.label ?? catId;
  }
}
