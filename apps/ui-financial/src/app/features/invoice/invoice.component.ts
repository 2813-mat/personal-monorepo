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
import type { OpenInvoiceItem } from '../../core/api/invoice.mapper';

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

  // Compras da fatura aberta, pelo ciclo de faturamento real (vem da API), mais
  // recentes primeiro.
  items = computed((): OpenInvoiceItem[] =>
    [...this.data.openInvoice().items].sort((a, b) => b.date.localeCompare(a.date))
  );

  total = computed(() => this.data.openInvoice().total);

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

  // Faturas fechadas do cartão, em ordem cronológica, vindas da API.
  private closed = computed(() =>
    [...this.data.invoiceHistory()].sort((a, b) => a.year - b.year || a.month - b.month)
  );

  closedCount = computed(() => this.closed().length);

  /** Fechadas (reais) + a fatura aberta do mês como última barra. */
  history = computed((): number[] => [...this.closed().map(i => i.total), this.total()]);

  /** A fatura aberta é sempre a última barra. */
  highlightIndex = computed(() => this.history().length - 1);

  // Estatísticas consideram só faturas fechadas: incluir o mês aberto, que ainda
  // está sendo formado, distorceria a média.
  private closedTotals = computed(() => this.closed().map(i => i.total));

  histAvg = computed(() => {
    const t = this.closedTotals();
    return t.length ? t.reduce((s, v) => s + v, 0) / t.length : 0;
  });
  histMax = computed(() => (this.closedTotals().length ? Math.max(...this.closedTotals()) : 0));
  histMin = computed(() => (this.closedTotals().length ? Math.min(...this.closedTotals()) : 0));

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

  constructor() {
    this.data.loadOpenInvoice(this.cardId);
    this.data.loadInvoiceHistory(this.cardId);
  }
}
