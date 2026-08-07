import { HttpErrorResponse } from '@angular/common/http';
import { categoryConflictMessage } from './category-conflict';

const conflict = (transactions: number, fixedExpenses: number) =>
  new HttpErrorResponse({
    status: 409,
    error: { message: 'Categoria em uso', transactions, fixedExpenses },
  });

describe('categoryConflictMessage', () => {
  it('usa as contagens que a API devolve', () => {
    expect(categoryConflictMessage(conflict(5, 4))).toBe(
      'Não dá para excluir: 5 lançamentos e 4 gastos fixos usam esta categoria.',
    );
  });

  it('fala no singular quando é um só', () => {
    expect(categoryConflictMessage(conflict(1, 1))).toBe(
      'Não dá para excluir: 1 lançamento e 1 gasto fixo usam esta categoria.',
    );
  });

  it('omite a parte que está zerada', () => {
    expect(categoryConflictMessage(conflict(3, 0))).toBe(
      'Não dá para excluir: 3 lançamentos usam esta categoria.',
    );
    expect(categoryConflictMessage(conflict(0, 2))).toBe(
      'Não dá para excluir: 2 gastos fixos usam esta categoria.',
    );
  });

  it('cai numa mensagem genérica se não for 409', () => {
    const err = new HttpErrorResponse({ status: 500 });
    expect(categoryConflictMessage(err)).toBe('Falha ao excluir categoria');
  });
});
