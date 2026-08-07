import { TestBed } from '@angular/core/testing';
import { CategoryEditDrawerComponent } from './category-edit-drawer.component';
import { AppDataService } from '../../layout/app-data.service';
import type { Category } from '@caixa-familia/shared-types';

const CAT: Category = { id: 'casa', label: 'Casa', color: '#7A4F1D', budget: 500, order: 1 };

function build() {
  const data = { updateCategory: jest.fn() };
  TestBed.configureTestingModule({
    imports: [CategoryEditDrawerComponent],
    providers: [{ provide: AppDataService, useValue: data }],
  });
  const fixture = TestBed.createComponent(CategoryEditDrawerComponent);
  fixture.componentRef.setInput('category', CAT);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data, c: fixture.componentInstance };
}

afterEach(() => TestBed.resetTestingModule());

describe('CategoryEditDrawerComponent', () => {
  it('preenche o formulário a partir da categoria', () => {
    expect(build().c.form.getRawValue()).toMatchObject({
      label: 'Casa',
      color: '#7A4F1D',
      budget: 500,
    });
  });

  it('mantém Salvar desabilitado enquanto nada mudou', () => {
    expect(build().el.querySelector('.save-btn').disabled).toBe(true);
  });

  it('salva a categoria com o id original', () => {
    const { c, data } = build();
    c.form.controls.budget.setValue(600);
    c.form.markAsDirty();
    c.save();
    expect(data.updateCategory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'casa', budget: 600 }),
    );
  });

  it('emite closed ao salvar', () => {
    const { c } = build();
    const seen: void[] = [];
    c.closed.subscribe(() => seen.push(undefined));
    c.form.markAsDirty();
    c.save();
    expect(seen.length).toBe(1);
  });
});
