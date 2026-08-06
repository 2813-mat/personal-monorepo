import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BudgetsComponent } from './budgets.component';
import { AppDataService } from '../../layout/app-data.service';
import { ViewportService } from '../../core/viewport.service';
import type { MonthEntry } from '../../core/api/report.mapper';
import type { Category } from '@caixa-familia/shared-types';

const CATEGORIES: Category[] = [
  { id: 'mercado', label: 'Mercado', color: '#2E7D5B', budget: 1000, order: 1 },
  { id: 'casa', label: 'Casa', color: '#7A4F1D', budget: 500, order: 1 },
];

const month = (m: number, perCategory: Record<string, number>): MonthEntry => ({
  m: `M${m}`,
  year: 2026,
  month: m,
  total: Object.values(perCategory).reduce((s, v) => s + v, 0),
  perCategory,
});

function build(history: MonthEntry[]) {
  const data = {
    categories: signal(CATEGORIES),
    transactions: signal([]),
    history: signal(history),
    catBy: signal(Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))),
    cardBy: signal({}),
    currentMonth: signal({ year: 2026, month: 7, label: 'Julho 2026', short: 'Jul/26' }),
  };
  TestBed.configureTestingModule({
    imports: [BudgetsComponent],
    providers: [{ provide: AppDataService, useValue: data }],
  });
  const fixture = TestBed.createComponent(BudgetsComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

afterEach(() => TestBed.resetTestingModule());

function rowOf(component: BudgetsComponent, catId: string) {
  const row = component.catRows().find((r) => r.cat.id === catId);
  if (!row) throw new Error(`Sem linha para a categoria ${catId}`);
  return row;
}

describe('BudgetsComponent — per-category history', () => {
  it('plots what the category actually spent each closed month', () => {
    const c = build([
      month(1, { mercado: 100, casa: 50 }),
      month(2, { mercado: 200, casa: 60 }),
    ]);
    expect(rowOf(c, 'mercado').history).toEqual([100, 200]);
    expect(rowOf(c, 'casa').history).toEqual([50, 60]);
  });

  it('counts a month with no spend in that category as zero, keeping the series aligned', () => {
    const c = build([
      month(1, { mercado: 100 }),
      month(2, { casa: 60 }),
      month(3, { mercado: 300 }),
    ]);
    expect(rowOf(c, 'mercado').history).toEqual([100, 0, 300]);
  });

  it('keeps only the six most recent closed months', () => {
    const eight = Array.from({ length: 8 }, (_, i) => month(i + 1, { mercado: (i + 1) * 10 }));
    expect(rowOf(build(eight), 'mercado').history).toEqual([30, 40, 50, 60, 70, 80]);
  });

  it('averages the real series', () => {
    const c = build([month(1, { mercado: 100 }), month(2, { mercado: 300 })]);
    expect(rowOf(c, 'mercado').histAvg).toBe(200);
  });

  it('returns an empty series when nothing is closed yet', () => {
    expect(rowOf(build([]), 'mercado').history).toEqual([]);
  });

  it('does not produce NaN for the average of an empty series', () => {
    const avg = rowOf(build([]), 'mercado').histAvg;
    expect(Number.isNaN(avg)).toBe(false);
    expect(avg).toBe(0);
  });

  it('does not invent a series from the category id', () => {
    // o defeito antigo: a série saía de um seed do catId e nunca era vazia
    expect(rowOf(build([]), 'mercado').history).not.toHaveLength(6);
  });
});

function buildResponsive(isDesktop: boolean) {
  const data = {
    categories: signal(CATEGORIES),
    transactions: signal([]),
    history: signal([] as MonthEntry[]),
    catBy: signal(Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))),
    cardBy: signal({}),
    currentMonth: signal({ year: 2026, month: 7, label: 'Julho 2026', short: 'Jul/26' }),
  };
  TestBed.configureTestingModule({
    imports: [BudgetsComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      { provide: ViewportService, useValue: { isDesktop: signal(isDesktop) } },
    ],
  });
  const fixture = TestBed.createComponent(BudgetsComponent);
  fixture.detectChanges();
  return fixture.nativeElement;
}

describe('BudgetsComponent — responsive rendering', () => {
  it('renders the table on desktop and no card list', () => {
    const el = buildResponsive(true);
    expect(el.querySelector('table.bud-table')).not.toBeNull();
    expect(el.querySelector('.bd-cards')).toBeNull();
  });

  it('renders the card list on mobile and no table', () => {
    const el = buildResponsive(false);
    expect(el.querySelector('.bd-cards')).not.toBeNull();
    expect(el.querySelector('table.bud-table')).toBeNull();
  });

  it('shows one card per category on mobile', () => {
    expect(buildResponsive(false).querySelectorAll('.bd-card').length).toBe(2);
  });
});
