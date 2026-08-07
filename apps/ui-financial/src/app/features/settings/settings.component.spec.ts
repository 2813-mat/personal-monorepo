import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SettingsComponent } from './settings.component';
import { AppDataService } from '../../layout/app-data.service';
import { AuthService } from '../../core/auth/auth.service';
import { ViewportService } from '../../core/viewport.service';
import type { Card, Category } from '@caixa-familia/shared-types';

const CARTAO = (over: Partial<Card> = {}): Card => ({
  id: 'c1',
  name: 'Nubank',
  holder: 'Thais',
  bank: 'Nubank',
  color: '#820AD1',
  closing: 5,
  due: 12,
  current: 0,
  limit: 4500,
  last4: '4421',
  archived: false,
  ...over,
});

const CATEGORIES: Category[] = [{ id: 'casa', label: 'Casa', color: '#7A4F1D', budget: 500, order: 1 }];

function mockDataService() {
  return {
    categories: signal(CATEGORIES),
    cards: signal([]),
    transactions: signal([]),
    catBy: signal(Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))),
    cardBy: signal({}),
    createCategory: jest.fn(),
    // O template lê estes em toda renderização da tela, não só na seção de
    // cartões — precisam existir em todo fixture.
    activeCards: signal([] as Card[]),
    cardRemovalConflict: signal<string | null>(null),
    createCard: jest.fn(),
    updateCard: jest.fn(),
    removeCard: jest.fn(),
    archiveCard: jest.fn(),
    clearCardRemovalConflict: jest.fn(),
  };
}

describe('SettingsComponent — new category form', () => {
  let component: SettingsComponent;
  let data: ReturnType<typeof mockDataService>;

  beforeEach(async () => {
    data = mockDataService();
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: AppDataService, useValue: data },
        { provide: AuthService, useValue: { canWrite: signal(true) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts with the form closed', () => {
    expect(component.showNewCategory()).toBe(false);
  });

  it('derives the slug from the label', () => {
    component.newCategory.patchValue({ label: 'Farmácia' });
    expect(component.newCategorySlug()).toBe('farmacia');
  });

  it('rejects a label that collides with an existing category', () => {
    component.newCategory.patchValue({ label: 'Casa' });
    expect(component.slugTaken()).toBe(true);
  });

  it('accepts a label that does not collide', () => {
    component.newCategory.patchValue({ label: 'Farmácia' });
    expect(component.slugTaken()).toBe(false);
  });

  it('starts with a colour already selected so the post is always valid', () => {
    expect(component.newCategory.controls.color.value).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('submits the slugified id, label, colour and budget', () => {
    component.newCategory.patchValue({ label: 'Farmácia', budget: 300, color: '#2E7D5B' });
    component.saveCategory();
    expect(data.createCategory).toHaveBeenCalledWith({
      id: 'farmacia',
      label: 'Farmácia',
      color: '#2E7D5B',
      budget: 300,
      // a posição real vem do backend (último + 1) no recarregamento
      order: 0,
    });
  });

  it('closes and resets the form after saving', () => {
    component.showNewCategory.set(true);
    component.newCategory.patchValue({ label: 'Farmácia', budget: 300 });
    component.saveCategory();
    expect(component.showNewCategory()).toBe(false);
    expect(component.newCategory.controls.label.value).toBe('');
  });

  it('does not submit a colliding slug', () => {
    component.newCategory.patchValue({ label: 'Casa', budget: 100 });
    component.saveCategory();
    expect(data.createCategory).not.toHaveBeenCalled();
  });

  it('does not submit without a label', () => {
    component.newCategory.patchValue({ label: '', budget: 100 });
    component.saveCategory();
    expect(data.createCategory).not.toHaveBeenCalled();
  });
});

const CARDS = [
  { id: 'nu-t', name: 'Nubank', holder: 'Thais', bank: 'Nubank', color: '#820AD1',
    closing: 5, due: 12, current: 300, limit: 4500, last4: '4421' },
] as never[];

function buildResponsive(isDesktop: boolean, section: 'cats' | 'cards' = 'cats') {
  const data = { ...mockDataService(), cards: signal(CARDS) };
  TestBed.configureTestingModule({
    imports: [SettingsComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      { provide: AuthService, useValue: { canWrite: signal(true) } },
      { provide: ViewportService, useValue: { isDesktop: signal(isDesktop) } },
    ],
  });
  const fixture = TestBed.createComponent(SettingsComponent);
  // activeSection é protected: acessível em runtime, o cast é só para o TS
  (fixture.componentInstance as never as { activeSection: { set(s: string): void } })
    .activeSection.set(section);
  fixture.detectChanges();
  return fixture.nativeElement;
}

function buildSettings(categories: Category[] = CATEGORIES) {
  const data = {
    ...mockDataService(),
    categories: signal(categories),
    catBy: signal(Object.fromEntries(categories.map((c) => [c.id, c]))),
    removeCategory: jest.fn(),
    reorderCategories: jest.fn(),
    cards: signal([] as Card[]),
  };
  TestBed.configureTestingModule({
    imports: [SettingsComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      { provide: AuthService, useValue: { canWrite: signal(true) } },
      { provide: ViewportService, useValue: { isDesktop: signal(true) } },
    ],
  });
  const fixture = TestBed.createComponent(SettingsComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, data };
}

describe('SettingsComponent — excluir categoria', () => {
  it('pede confirmação antes de excluir', () => {
    const { component, data } = buildSettings();
    component.askRemoveCategory('casa');
    expect(component.confirmingRemoval()).toBe('casa');
    expect(data.removeCategory).not.toHaveBeenCalled();
  });

  it('exclui ao confirmar', () => {
    const { component, data } = buildSettings();
    component.askRemoveCategory('casa');
    component.confirmRemoveCategory();
    expect(data.removeCategory).toHaveBeenCalledWith('casa');
    expect(component.confirmingRemoval()).toBeNull();
  });

  it('não exclui ao cancelar', () => {
    const { component, data } = buildSettings();
    component.askRemoveCategory('casa');
    component.cancelRemoveCategory();
    expect(data.removeCategory).not.toHaveBeenCalled();
    expect(component.confirmingRemoval()).toBeNull();
  });
});

describe('SettingsComponent — reordenar', () => {
  it('sobe uma categoria e manda a lista completa', () => {
    const { component, data } = buildSettings([
      { id: 'a', label: 'A', color: '#000000', budget: 0, order: 1 },
      { id: 'b', label: 'B', color: '#000000', budget: 0, order: 2 },
      { id: 'c', label: 'C', color: '#000000', budget: 0, order: 3 },
    ]);
    component.moveCategory('b', -1);
    expect(data.reorderCategories).toHaveBeenCalledWith(['b', 'a', 'c']);
  });

  it('desce uma categoria', () => {
    const { component, data } = buildSettings([
      { id: 'a', label: 'A', color: '#000000', budget: 0, order: 1 },
      { id: 'b', label: 'B', color: '#000000', budget: 0, order: 2 },
    ]);
    component.moveCategory('a', 1);
    expect(data.reorderCategories).toHaveBeenCalledWith(['b', 'a']);
  });

  it('ignora subir a primeira', () => {
    const { component, data } = buildSettings([
      { id: 'a', label: 'A', color: '#000000', budget: 0, order: 1 },
    ]);
    component.moveCategory('a', -1);
    expect(data.reorderCategories).not.toHaveBeenCalled();
  });

  it('ignora descer a última', () => {
    const { component, data } = buildSettings([
      { id: 'a', label: 'A', color: '#000000', budget: 0, order: 1 },
    ]);
    component.moveCategory('a', 1);
    expect(data.reorderCategories).not.toHaveBeenCalled();
  });
});

describe('SettingsComponent — responsive rendering', () => {
  it('renders the categories table on desktop and no card list', () => {
    const el = buildResponsive(true, 'cats');
    expect(el.querySelector('table.tbl')).not.toBeNull();
    expect(el.querySelector('.st-cards')).toBeNull();
  });

  it('renders the categories as cards on mobile', () => {
    const el = buildResponsive(false, 'cats');
    expect(el.querySelector('table.tbl')).toBeNull();
    expect(el.querySelectorAll('.st-card').length).toBe(1);
  });

  it('renders the cards table on desktop', () => {
    const el = buildResponsive(true, 'cards');
    expect(el.querySelector('table.tbl')).not.toBeNull();
    expect(el.querySelector('.st-cards')).toBeNull();
  });

  it('renders the credit cards as cards on mobile', () => {
    const el = buildResponsive(false, 'cards');
    expect(el.querySelector('table.tbl')).toBeNull();
    expect(el.querySelectorAll('.st-card').length).toBe(1);
  });
});

describe('SettingsComponent — cartões', () => {
  it('abre o drawer vazio para criar', () => {
    const { component } = buildSettings();
    component.startNewCard();
    expect(component.creatingCard()).toBe(true);
    expect(component.editingCard()).toBeNull();
  });

  it('abre o drawer preenchido para editar', () => {
    const { component } = buildSettings();
    const card = CARTAO();
    component.startEditCard(card);
    expect(component.editingCard()).toBe(card);
    expect(component.creatingCard()).toBe(false);
  });

  it('fecha os dois modos de uma vez', () => {
    const { component } = buildSettings();
    component.startNewCard();
    component.closeCardDrawer();
    expect(component.creatingCard()).toBe(false);
    expect(component.editingCard()).toBeNull();
  });
});

describe('SettingsComponent — excluir cartão', () => {
  it('pede confirmação antes de excluir', () => {
    const { component, data } = buildSettings();
    component.askRemoveCard('c1');
    expect(component.confirmingCardRemoval()).toBe('c1');
    expect(data.removeCard).not.toHaveBeenCalled();
  });

  it('exclui ao confirmar', () => {
    const { component, data } = buildSettings();
    component.askRemoveCard('c1');
    component.confirmRemoveCard();
    expect(data.removeCard).toHaveBeenCalledWith('c1');
    expect(component.confirmingCardRemoval()).toBeNull();
  });

  it('guarda o cartão para poder arquivar se vier 409', () => {
    const { component } = buildSettings();
    component.askRemoveCard('c1');
    component.confirmRemoveCard();
    expect(component.pendingCardId()).toBe('c1');
  });

  it('arquiva o cartão do conflito e limpa o estado', () => {
    const { component, data } = buildSettings();
    component.askRemoveCard('c1');
    component.confirmRemoveCard();
    component.archivePendingCard();
    expect(data.archiveCard).toHaveBeenCalledWith('c1', true);
    expect(component.pendingCardId()).toBeNull();
    expect(data.clearCardRemovalConflict).toHaveBeenCalled();
  });

  it('desiste do conflito sem arquivar', () => {
    const { component, data } = buildSettings();
    component.askRemoveCard('c1');
    component.confirmRemoveCard();
    component.dismissCardConflict();
    expect(data.archiveCard).not.toHaveBeenCalled();
    expect(component.pendingCardId()).toBeNull();
  });

  it('não exclui ao cancelar', () => {
    const { component, data } = buildSettings();
    component.askRemoveCard('c1');
    component.cancelRemoveCard();
    expect(data.removeCard).not.toHaveBeenCalled();
    expect(component.confirmingCardRemoval()).toBeNull();
  });
});

describe('SettingsComponent — cartão arquivado', () => {
  it('marca o cartão arquivado na tabela', () => {
    const { fixture, data } = buildSettings();
    data.cards.set([CARTAO({ archived: true })]);
    (
      fixture.componentInstance as never as { activeSection: { set(s: string): void } }
    ).activeSection.set('cards');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Arquivado');
  });

  it('não marca cartão ativo', () => {
    const { fixture, data } = buildSettings();
    data.cards.set([CARTAO()]);
    (
      fixture.componentInstance as never as { activeSection: { set(s: string): void } }
    ).activeSection.set('cards');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Arquivado');
  });
});
