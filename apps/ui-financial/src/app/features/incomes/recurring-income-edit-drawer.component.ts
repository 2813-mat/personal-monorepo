import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Holder, RecurringIncome } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { IconComponent } from '../../ui/icon/icon.component';

const VAZIO = {
  label: '',
  value: 0,
  day: 5,
  holder: 'shared' as Holder,
};

@Component({
  selector: 'cf-recurring-income-edit-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './recurring-income-edit-drawer.component.html',
  styleUrl: './recurring-income-edit-drawer.component.scss',
})
export class RecurringIncomeEditDrawerComponent {
  private data = inject(AppDataService);

  /** Ausente significa criação. */
  readonly template = input<RecurringIncome | null>(null);
  readonly closed = output<void>();

  protected isEditing = computed(() => this.template() !== null);

  form = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    value: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
    day: new FormControl(5, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(31)],
    }),
    holder: new FormControl<Holder>('shared', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const t = this.template();
      this.form.setValue(
        t ? { label: t.label, value: t.value, day: t.day, holder: t.holder } : { ...VAZIO },
      );
      this.form.markAsPristine();
    });
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const existing = this.template();
    // startDate não é editável: mexer nele reescreveria de que mês em diante o
    // template já gerou linha, e as linhas antigas ficariam órfãs do cálculo.
    if (existing) this.data.updateRecurringIncome({ ...existing, ...v });
    else this.data.createRecurringIncome({ id: '', startDate: '', ...v });
    this.closed.emit();
  }
}
