import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TxDetailDrawerComponent } from './tx-detail-drawer.component';
import { AppDataService } from '../../layout/app-data.service';
import { AuthService } from '../../core/auth/auth.service';
import type { Transaction } from '@caixa-familia/shared-types';

const TX: Transaction = {
  id: 't1',
  date: '2026-05-05',
  label: 'Mercado',
  value: 240,
  cat: 'casa',
  holder: 'Mateus',
  method: 'pix',
  installments: null,
  reviewed: false,
};

function build(tx: Transaction = TX) {
  const data = {
    setTransactionReviewed: jest.fn(),
    removeTransaction: jest.fn(),
    createTransaction: jest.fn(),
    catBy: signal({}),
    cardBy: signal({}),
  };
  TestBed.configureTestingModule({
    imports: [TxDetailDrawerComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      { provide: AuthService, useValue: { canWrite: signal(true) } },
    ],
  });
  const fixture = TestBed.createComponent(TxDetailDrawerComponent);
  fixture.componentRef.setInput('tx', tx);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data };
}

afterEach(() => TestBed.resetTestingModule());

describe('TxDetailDrawerComponent — conferido', () => {
  it('oferece marcar quando não conferida', () => {
    expect(build().el.querySelector('.btn-review').textContent).toContain(
      'Marcar como conferido',
    );
  });

  it('mostra o estado quando já conferida', () => {
    expect(build({ ...TX, reviewed: true }).el.querySelector('.btn-review').textContent).toContain(
      'Conferido',
    );
  });

  it('marca ao clicar', () => {
    const { el, data } = build();
    el.querySelector('.btn-review').click();
    expect(data.setTransactionReviewed).toHaveBeenCalledWith('t1', true);
  });

  it('desmarca ao clicar quando já conferida', () => {
    const { el, data } = build({ ...TX, reviewed: true });
    el.querySelector('.btn-review').click();
    expect(data.setTransactionReviewed).toHaveBeenCalledWith('t1', false);
  });
});
