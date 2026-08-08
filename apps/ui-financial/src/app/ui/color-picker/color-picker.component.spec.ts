import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ColorPickerComponent, type ColorOption } from './color-picker.component';

const PALETA: ColorOption[] = [
  { hex: '#0B6E2F', nome: 'Verde' },
  { hex: '#A16207', nome: 'Mostarda' },
  { hex: '#334155', nome: 'Grafite' },
];

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ColorPickerComponent],
  template: `<cf-color-picker [formControl]="ctrl" [palette]="paleta()" inputId="teste-cor" />`,
})
class HostComponent {
  readonly ctrl = new FormControl('#0B6E2F', { nonNullable: true });
  readonly paleta = signal(PALETA);
}

function build(valorInicial = '#0B6E2F') {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.ctrl.setValue(valorInicial);
  fixture.detectChanges();
  const el: HTMLElement = fixture.nativeElement;
  return { fixture, el, ctrl: fixture.componentInstance.ctrl };
}

const amostras = (el: HTMLElement) =>
  Array.from(el.querySelectorAll<HTMLButtonElement>('.swatch'));

afterEach(() => TestBed.resetTestingModule());

describe('ColorPickerComponent', () => {
  it('desenha uma amostra por cor da paleta', () => {
    expect(amostras(build().el)).toHaveLength(3);
  });

  it('rotula cada amostra pelo nome da cor — hexadecimal ninguém lê', () => {
    expect(amostras(build().el).map((s) => s.getAttribute('aria-label'))).toEqual([
      'Verde',
      'Mostarda',
      'Grafite',
    ]);
  });

  it('marca a amostra do valor atual', () => {
    const { el } = build('#A16207');
    expect(el.querySelector('.swatch.active')?.getAttribute('aria-label')).toBe('Mostarda');
  });

  it('reconhece o valor em outra caixa', () => {
    const { el } = build('#a16207');
    expect(el.querySelector('.swatch.active')?.getAttribute('aria-label')).toBe('Mostarda');
  });

  it('escreve a cor escolhida no controle', () => {
    const { el, ctrl, fixture } = build();
    amostras(el)[2].click();
    fixture.detectChanges();
    expect(ctrl.value).toBe('#334155');
  });

  it('suja o controle ao escolher — o Salvar dos drawers depende disso', () => {
    const { el, ctrl } = build();
    expect(ctrl.dirty).toBe(false);
    amostras(el)[1].click();
    expect(ctrl.dirty).toBe(true);
  });

  it('oferece o seletor nativo para uma cor fora da paleta', () => {
    const input = build().el.querySelector<HTMLInputElement>('input#teste-cor');
    expect(input?.type).toBe('color');
  });

  it('mostra o hexadecimal escolhido', () => {
    expect(build('#A16207').el.querySelector('.color-hex')?.textContent).toContain('#A16207');
  });

  it('aceita uma cor de fora da paleta pelo seletor nativo', () => {
    const { el, ctrl, fixture } = build();
    const input = el.querySelector('input#teste-cor') as HTMLInputElement;
    input.value = '#123456';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(ctrl.value).toBe('#123456');
    expect(el.querySelector('.swatch.active')).toBeNull();
  });

  it('acompanha o valor escrito de fora, sem clique', () => {
    const { el, ctrl, fixture } = build();
    ctrl.setValue('#334155');
    fixture.detectChanges();
    expect(el.querySelector('.swatch.active')?.getAttribute('aria-label')).toBe('Grafite');
  });
});
