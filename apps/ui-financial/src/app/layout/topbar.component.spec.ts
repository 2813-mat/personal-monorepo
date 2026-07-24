import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { TopBarComponent } from './topbar.component';
import { AppDataService } from './app-data.service';
import { AuthService } from '../core/auth/auth.service';
import { monthContextOf } from '@caixa-familia/shared-utils';

function build() {
  const currentMonth = signal(monthContextOf(new Date(2026, 4, 1)));
  const data = {
    currentMonth,
    holderFilter: signal('todos' as const),
    monthLabel: computed(() => currentMonth().label),
    categories: signal([]),
    cards: signal([]),
    goals: signal([]),
    catBy: signal({}),
    cardBy: signal({}),
  };
  TestBed.configureTestingModule({
    imports: [TopBarComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      {
        provide: AuthService,
        useValue: {
          canWrite: signal(true),
          isAuthenticated: signal(true),
          userName: signal('Mateus'),
          roles: signal(['editor']),
          logout: jest.fn(),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(TopBarComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, data };
}

afterEach(() => TestBed.resetTestingModule());

describe('TopBarComponent — month navigation', () => {
  it('steps back a month', () => {
    const { component, data } = build();
    component.prevMonth();
    expect(data.currentMonth()).toMatchObject({ year: 2026, month: 4, short: 'Abr/26' });
  });

  it('steps forward a month', () => {
    const { component, data } = build();
    component.nextMonth();
    expect(data.currentMonth()).toMatchObject({ year: 2026, month: 6, short: 'Jun/26' });
  });

  it('crosses the year boundary backwards', () => {
    const { component, data } = build();
    data.currentMonth.set(monthContextOf(new Date(2026, 0, 1)));
    component.prevMonth();
    expect(data.currentMonth()).toMatchObject({ year: 2025, month: 12, short: 'Dez/25' });
  });

  it('crosses the year boundary forwards', () => {
    const { component, data } = build();
    data.currentMonth.set(monthContextOf(new Date(2026, 11, 1)));
    component.nextMonth();
    expect(data.currentMonth()).toMatchObject({ year: 2027, month: 1, short: 'Jan/27' });
  });

  it('keeps the label shape stable when navigating', () => {
    const { component, data } = build();
    const before = data.currentMonth().short;
    component.nextMonth();
    // o bug antigo virava 'jun. de 26' assim que se navegava
    expect(before).toMatch(/^[A-Z][a-z]{2}\/\d{2}$/);
    expect(data.currentMonth().short).toMatch(/^[A-Z][a-z]{2}\/\d{2}$/);
    expect(data.currentMonth().label).toMatch(/^[A-ZÇ][a-zç]+ \d{4}$/);
  });
});
