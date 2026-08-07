import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Holder, Income } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  selector: 'cf-income-edit-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './income-edit-drawer.component.html',
  styleUrl: './income-edit-drawer.component.scss',
})
export class IncomeEditDrawerComponent {
  private data = inject(AppDataService);

  readonly income = input.required<Income>();
  readonly closed = output<void>();

  /** Linha vinda de um template: o aviso muda, porque a edição é só deste mês. */
  protected isFromTemplate = computed(() => this.income().recurringIncomeId != null);

  form = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    value: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    date: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    holder: new FormControl<Holder>('shared', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const i = this.income();
      this.form.setValue({
        label: i.label,
        value: i.value,
        date: i.date,
        holder: i.holder,
      });
      this.form.markAsPristine();
    });
  }

  save() {
    if (this.form.invalid) return;
    // recurring e recurringIncomeId sobrevivem pelo espalhamento: o PATCH não
    // os edita, e desfazer o vínculo aqui apagaria a origem da linha.
    this.data.updateIncome({ ...this.income(), ...this.form.getRawValue() });
    this.closed.emit();
  }
}
