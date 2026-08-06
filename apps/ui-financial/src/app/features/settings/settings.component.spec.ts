import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SettingsComponent } from './settings.component';
import { AppDataService } from '../../layout/app-data.service';
import { AuthService } from '../../core/auth/auth.service';
import { ViewportService } from '../../core/viewport.service';
import type { Category } from '@caixa-familia/shared-types';

const CATEGORIES: Category[] = [{ id: 'casa', label: 'Casa', color: '#7A4F1D', budget: 500 }];

function mockDataService() {
  return {
    categories: signal(CATEGORIES),
    cards: signal([]),
    transactions: signal([]),
    catBy: signal(Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))),
    cardBy: signal({}),
    createCategory: jest.fn(),
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
