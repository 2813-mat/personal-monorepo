import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ReportsComponent } from './reports.component';
import { AppDataService } from '../../layout/app-data.service';
import type { MonthEntry } from '../../core/api/report.mapper';

function mockDataService(history: MonthEntry[], incomeHistory: MonthEntry[]) {
  return {
    history: signal(history),
    incomeHistory: signal(incomeHistory),
    transactions: signal([]),
    categories: signal([]),
    catBy: signal({}),
    currentMonth: signal({ year: 2026, month: 5, label: 'Maio 2026', short: 'mai' }),
  };
}

function build(history: MonthEntry[], incomeHistory: MonthEntry[]) {
  TestBed.configureTestingModule({
    imports: [ReportsComponent],
    providers: [{ provide: AppDataService, useValue: mockDataService(history, incomeHistory) }],
  });
  const fixture = TestBed.createComponent(ReportsComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

afterEach(() => TestBed.resetTestingModule());

const twelve = (): MonthEntry[] =>
  Array.from({ length: 12 }, (_, i) => ({ m: `M${i}`, total: 1000 + i }));

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
