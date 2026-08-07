import { TestBed } from '@angular/core/testing';
import { CardEditDrawerComponent } from './card-edit-drawer.component';
import { AppDataService } from '../../layout/app-data.service';
import type { Card } from '@caixa-familia/shared-types';

const CARD: Card = {
  id: 'c1',
  name: 'Nubank',
  holder: 'Thais',
  bank: 'Nubank',
  color: '#820AD1',
  closing: 5,
  due: 12,
  current: 1895,
  limit: 4500,
  last4: '4421',
  archived: false,
};

function build(card: Card | null) {
  const data = { createCard: jest.fn(), updateCard: jest.fn() };
  TestBed.configureTestingModule({
    imports: [CardEditDrawerComponent],
    providers: [{ provide: AppDataService, useValue: data }],
  });
  const fixture = TestBed.createComponent(CardEditDrawerComponent);
  fixture.componentRef.setInput('card', card);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data, c: fixture.componentInstance };
}

afterEach(() => TestBed.resetTestingModule());

describe('CardEditDrawerComponent — edição', () => {
  it('preenche o formulário a partir do cartão', () => {
    expect(build(CARD).c.form.getRawValue()).toMatchObject({
      name: 'Nubank',
      bank: 'Nubank',
      last4: '4421',
      closing: 5,
      due: 12,
      limit: 4500,
      holder: 'Thais',
    });
  });

  it('mantém Salvar desabilitado enquanto nada mudou', () => {
    expect(build(CARD).el.querySelector('.save-btn').disabled).toBe(true);
  });

  it('salva preservando o id e chama updateCard', () => {
    const { c, data } = build(CARD);
    c.form.controls.limit.setValue(6000);
    c.form.markAsDirty();
    c.save();
    expect(data.updateCard).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1', limit: 6000 }),
    );
    expect(data.createCard).not.toHaveBeenCalled();
  });

  it('emite closed ao salvar', () => {
    const { c } = build(CARD);
    const seen: void[] = [];
    c.closed.subscribe(() => seen.push(undefined));
    c.form.markAsDirty();
    c.save();
    expect(seen.length).toBe(1);
  });
});

describe('CardEditDrawerComponent — criação', () => {
  const NOVO = {
    name: 'Inter',
    bank: 'Inter',
    color: '#FF7A00',
    last4: '0001',
    limit: 1000,
    closing: 1,
    due: 8,
    holder: 'shared' as const,
  };

  it('abre vazio quando não há cartão', () => {
    expect(build(null).c.form.getRawValue().name).toBe('');
  });

  it('chama createCard sem id', () => {
    const { c, data } = build(null);
    c.form.setValue(NOVO);
    c.form.markAsDirty();
    c.save();
    expect(data.createCard).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Inter', holder: 'shared' }),
    );
    expect(data.createCard.mock.calls[0][0]).not.toHaveProperty('id');
    expect(data.updateCard).not.toHaveBeenCalled();
  });

  it('não salva com últimos 4 inválidos', () => {
    const { c, data } = build(null);
    c.form.setValue({ ...NOVO, last4: '12a' });
    c.form.markAsDirty();
    c.save();
    expect(data.createCard).not.toHaveBeenCalled();
  });

  it('não salva com dia de fechamento fora de 1 a 31', () => {
    const { c, data } = build(null);
    c.form.setValue({ ...NOVO, closing: 32 });
    c.form.markAsDirty();
    c.save();
    expect(data.createCard).not.toHaveBeenCalled();
  });
});
