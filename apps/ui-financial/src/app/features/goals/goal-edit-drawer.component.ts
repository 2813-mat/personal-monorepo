import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Goal } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { IconComponent } from '../../ui/icon/icon.component';
import { ColorPickerComponent, type ColorOption } from '../../ui/color-picker/color-picker.component';

/**
 * Cores da meta: é a faixa do card, a barra de progresso e a coluna dela na
 * projeção. Marca de banco não diz nada aqui, então a paleta é de tons
 * distinguíveis entre si — duas metas lado a lado precisam se diferenciar.
 */
const PALETA: readonly ColorOption[] = [
  { hex: '#0B6E2F', nome: 'Verde' },
  { hex: '#0F766E', nome: 'Verde-petróleo' },
  { hex: '#0369A1', nome: 'Azul' },
  { hex: '#1F4E79', nome: 'Azul-marinho' },
  { hex: '#7C3AED', nome: 'Roxo' },
  { hex: '#BE185D', nome: 'Magenta' },
  { hex: '#B91C1C', nome: 'Vermelho' },
  { hex: '#C2410C', nome: 'Laranja' },
  { hex: '#A16207', nome: 'Mostarda' },
  { hex: '#B45309', nome: 'Âmbar' },
  { hex: '#4D7C0F', nome: 'Verde-oliva' },
  { hex: '#334155', nome: 'Grafite' },
];

const VAZIO = {
  label: '',
  subtitle: '',
  target: 0,
  monthly: 0,
  color: '#0B6E2F',
  type: 'sonho' as Goal['type'],
};

@Component({
  selector: 'cf-goal-edit-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, ColorPickerComponent],
  templateUrl: './goal-edit-drawer.component.html',
  styleUrl: './goal-edit-drawer.component.scss',
})
export class GoalEditDrawerComponent {
  private data = inject(AppDataService);

  /** Ausente significa criação. */
  readonly goal = input<Goal | null>(null);
  readonly closed = output<void>();

  protected isEditing = computed(() => this.goal() !== null);
  protected readonly paleta = PALETA;

  form = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    subtitle: new FormControl('', { nonNullable: true }),
    // Objetivo e aporte zerados dariam NaN% e ∞ meses no card: ele divide o
    // saldo por um e o que falta pelo outro.
    target: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
    monthly: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
    // Espelha o @IsHexColor do DTO na forma que o seletor nativo produz.
    color: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
    }),
    type: new FormControl<Goal['type']>('sonho', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const g = this.goal();
      this.form.setValue(
        g
          ? {
              label: g.label,
              subtitle: g.subtitle,
              target: g.target,
              monthly: g.monthly,
              color: g.color,
              type: g.type,
            }
          : { ...VAZIO },
      );
      this.form.markAsPristine();
    });
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const existing = this.goal();
    if (existing) {
      // Espalha a meta original primeiro: balance, history e contributionCount
      // são derivados e precisam sobreviver ao merge.
      this.data.updateGoal({ ...existing, ...v });
    } else {
      this.data.createGoal(v);
    }
    this.closed.emit();
  }
}
