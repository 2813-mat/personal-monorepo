import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ReportsComponent } from './reports.component';
import { AppDataService } from '../../layout/app-data.service';
import { AuthService } from '../../core/auth/auth.service';
import type { MonthEntry } from '../../core/api/report.mapper';

function mockDataService(history: MonthEntry[], incomeHistory: MonthEntry[], year = 2026) {
  return {
    history: signal(history),
    incomeHistory: signal(incomeHistory),
    transactions: signal([]),
    categories: signal([]),
    catBy: signal({}),
    currentMonth: signal({ year, month: 5, label: `Maio ${year}`, short: 'mai' }),
    closeMonth: jest.fn(),
  };
}

function build(history: MonthEntry[], incomeHistory: MonthEntry[], year = 2026, admin = true) {
  const data = mockDataService(history, incomeHistory, year);
  TestBed.configureTestingModule({
    imports: [ReportsComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      { provide: AuthService, useValue: { isAdmin: signal(admin), canWrite: signal(true) } },
    ],
  });
  const fixture = TestBed.createComponent(ReportsComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

/** Igual a `build`, mas devolve também o serviço mockado. */
function buildWith(year: number, month: number, admin = true) {
  const data = mockDataService([], [], year);
  data.currentMonth.set({ year, month, label: `M ${year}`, short: 'm' });
  data.closeMonth = jest.fn();
  TestBed.configureTestingModule({
    imports: [ReportsComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      { provide: AuthService, useValue: { isAdmin: signal(admin), canWrite: signal(true) } },
    ],
  });
  const fixture = TestBed.createComponent(ReportsComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, data };
}

afterEach(() => TestBed.resetTestingModule());

const twelve = (year = 2026): MonthEntry[] =>
  Array.from({ length: 12 }, (_, i) => ({
    m: `M${i}`,
    year,
    month: i + 1,
    total: 1000 + i,
  }));

/** Um ponto por mês, com total fixo, para somas previsíveis. */
const yearOf = (year: number, total: number, months = 12): MonthEntry[] =>
  Array.from({ length: months }, (_, i) => ({
    m: `${year}-${i + 1}`,
    year,
    month: i + 1,
    total,
  }));

describe('ReportsComponent — chart layout', () => {
  it('keeps twelve-month spacing for a full year', () => {
    const model = build(twelve(), twelve()).chartModel();
    expect(model.bars).toHaveLength(12);
    expect(model.bars[11].expX + model.barW).toBeLessThanOrEqual(1100);
  });

  it('does not overflow the SVG when there are more than twelve months', () => {
    const many: MonthEntry[] = Array.from({ length: 18 }, (_, i) => ({ m: `M${i}`, total: 1000 }));
    const model = build(many, many).chartModel();
    expect(model.bars).toHaveLength(18);
    expect(model.bars[17].expX + model.barW).toBeLessThanOrEqual(1100);
  });

  it('does not blow the bars up for a short series', () => {
    const three: MonthEntry[] = [
      { m: 'Mar/26', total: 100 },
      { m: 'Abr/26', total: 200 },
      { m: 'Mai/26', total: 300 },
    ];
    const shortBarW = build(three, three).chartModel().barW;
    TestBed.resetTestingModule();
    const fullBarW = build(twelve(), twelve()).chartModel().barW;
    expect(shortBarW).toBeCloseTo(fullBarW);
  });
});

describe('ReportsComponent — empty series', () => {
  it('reports that it has no data', () => {
    expect(build([], []).hasHistory()).toBe(false);
  });

  it('reports that it has data when the series is populated', () => {
    expect(build(twelve(), twelve()).hasHistory()).toBe(true);
  });

  it('produces no bars and finite geometry for an empty series', () => {
    const model = build([], []).chartModel();
    expect(model.bars).toEqual([]);
    expect(model.gridlines.every((g) => Number.isFinite(g.y))).toBe(true);
  });

  it('zeroes the savings aggregates for an empty series', () => {
    const c = build([], []);
    expect(c.avgSavings()).toBe(0);
    expect(c.bestSavingsMonth()).toEqual({ m: '', total: 0 });
  });
});

describe('ReportsComponent — year-scoped KPIs', () => {
  // 2025: despesa 100/mês, receita 200/mês. 2026: despesa 300/mês, receita 500/mês.
  const expenses = [...yearOf(2025, 100), ...yearOf(2026, 300)];
  const incomes = [...yearOf(2025, 200), ...yearOf(2026, 500)];

  function kpi(component: ReportsComponent, label: string) {
    return component.kpis().find((k) => k.label.startsWith(label));
  }

  it('sums the year from currentMonth, not a hardcoded one', () => {
    const c = build(expenses, incomes, 2026);
    expect(kpi(c, 'Receita')?.value).toBe(500 * 12);
    expect(kpi(c, 'Despesa')?.value).toBe(300 * 12);
  });

  it('follows the month context into another year', () => {
    const c = build(expenses, incomes, 2025);
    expect(kpi(c, 'Receita')?.value).toBe(200 * 12);
    expect(kpi(c, 'Despesa')?.value).toBe(100 * 12);
  });

  it('labels the KPIs with the year in context', () => {
    const c = build(expenses, incomes, 2026);
    expect(kpi(c, 'Receita')?.label).toBe('Receita 2026 YTD');
    expect(kpi(c, 'Despesa')?.label).toBe('Despesa 2026 YTD');
    expect(kpi(c, 'Sobra')?.label).toBe('Sobra 2026');
    expect(kpi(c, 'vs.')?.label).toBe('vs. 2025');
  });

  it('relabels when the context moves to another year', () => {
    const c = build(expenses, incomes, 2027);
    expect(kpi(c, 'Receita')?.label).toBe('Receita 2027 YTD');
    expect(kpi(c, 'vs.')?.label).toBe('vs. 2026');
  });

  it('compares the average against the previous year', () => {
    const c = build(expenses, incomes, 2026);
    // média 2025 = 100, média 2026 = 300 → +200%
    expect(kpi(c, 'vs.')?.display).toContain('200');
  });

  it('does not zero out when the calendar year rolls over', () => {
    // o defeito antigo: com o ano no código, um contexto de 2027 zerava tudo
    const c = build([...expenses, ...yearOf(2027, 400)], [...incomes, ...yearOf(2027, 900)], 2027);
    expect(kpi(c, 'Receita')?.value).toBe(900 * 12);
    expect(kpi(c, 'Despesa')?.value).toBe(400 * 12);
  });
});

describe('ReportsComponent — close month', () => {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;

  it('offers the action to an admin', () => {
    expect(buildWith(2025, 6).component.canCloseMonth()).toBe(true);
  });

  it('hides the action from a non-admin', () => {
    expect(buildWith(2025, 6, false).component.canCloseMonth()).toBe(false);
  });

  it('refuses to close the month still in progress', () => {
    const { component } = buildWith(thisYear, thisMonth);
    expect(component.monthInProgress()).toBe(true);
    expect(component.canCloseMonth()).toBe(false);
  });

  it('allows closing a month already past', () => {
    const { component } = buildWith(2025, 1);
    expect(component.monthInProgress()).toBe(false);
    expect(component.canCloseMonth()).toBe(true);
  });

  it('refuses a future month too', () => {
    const { component } = buildWith(thisYear + 1, 3);
    expect(component.canCloseMonth()).toBe(false);
  });

  it('asks for confirmation before closing', () => {
    const { component, data } = buildWith(2025, 6);
    component.askCloseMonth();
    expect(component.confirmingClose()).toBe(true);
    expect(data.closeMonth).not.toHaveBeenCalled();
  });

  it('closes the navigated month once confirmed', () => {
    const { component, data } = buildWith(2025, 6);
    component.askCloseMonth();
    component.confirmCloseMonth();
    expect(data.closeMonth).toHaveBeenCalledWith(2025, 6);
    expect(component.confirmingClose()).toBe(false);
  });

  it('does nothing when the confirmation is dismissed', () => {
    const { component, data } = buildWith(2025, 6);
    component.askCloseMonth();
    component.cancelCloseMonth();
    expect(data.closeMonth).not.toHaveBeenCalled();
    expect(component.confirmingClose()).toBe(false);
  });
});
