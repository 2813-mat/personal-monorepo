import { HttpErrorResponse } from '@angular/common/http';
import { cardConflictMessage } from './card-conflict';

const conflict = (transactions: number, invoices: number) =>
  new HttpErrorResponse({
    status: 409,
    error: { message: 'Cartão em uso', transactions, invoices },
  });

describe('cardConflictMessage', () => {
  it('usa as contagens que a API devolve', () => {
    expect(cardConflictMessage(conflict(47, 8))).toBe(
      'Não dá para excluir: 47 lançamentos e 8 faturas usam este cartão.',
    );
  });

  it('fala no singular quando é um só', () => {
    expect(cardConflictMessage(conflict(1, 1))).toBe(
      'Não dá para excluir: 1 lançamento e 1 fatura usam este cartão.',
    );
  });

  it('omite a parte que está zerada', () => {
    expect(cardConflictMessage(conflict(3, 0))).toBe(
      'Não dá para excluir: 3 lançamentos usam este cartão.',
    );
    expect(cardConflictMessage(conflict(0, 2))).toBe(
      'Não dá para excluir: 2 faturas usam este cartão.',
    );
  });

  it('cai numa mensagem genérica se não for 409', () => {
    expect(cardConflictMessage(new HttpErrorResponse({ status: 500 }))).toBe(
      'Falha ao excluir cartão',
    );
  });
});
