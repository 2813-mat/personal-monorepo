import { Component, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { FixedExpense, PaymentMethod } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { IconComponent } from '../../ui/icon/icon.component';

/** `yyyy-mm-dd` de hoje, que é o que o input date espera. */
function hojeIso(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

@Component({
  selector: 'cf-fixed-pay-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './fixed-pay-drawer.component.html',
  styleUrl: './fixed-pay-drawer.component.scss',
})
export class FixedPayDrawerComponent {
  protected data = inject(AppDataService);

  readonly fixed = input.required<FixedExpense>();
  readonly closed = output<void>();

  form = new FormGroup({
    date: new FormControl(hojeIso(), { nonNullable: true, validators: [Validators.required] }),
    value: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    method: new FormControl<PaymentMethod>('pix', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      // O valor do cadastro é a proposta; a conta de luz que veio diferente é
      // corrigida aqui, e o lançamento guarda o que de fato saiu.
      this.form.setValue({ date: hojeIso(), value: this.fixed().value, method: 'pix' });
      this.form.markAsPristine();
    });
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.data.payFixed(this.fixed().id, {
      date: v.date,
      value: v.value,
      method: v.method,
    });
    this.closed.emit();
  }
}
