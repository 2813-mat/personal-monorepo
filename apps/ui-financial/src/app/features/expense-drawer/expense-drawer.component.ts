import { Component, inject, output } from '@angular/core';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import type { Holder, Transaction } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { IconComponent } from '../../ui/icon/icon.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { CardChipComponent } from '../../ui/card-chip/card-chip.component';

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'cf-expense-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IconComponent,
    AvatarComponent,
    CatDotComponent,
    CardChipComponent,
  ],
  host: {
    '(document:keydown.escape)': 'onClose()',
    '(document:keydown.control.enter)': 'save()',
    '(document:keydown.meta.enter)': 'save()',
  },
  templateUrl: './expense-drawer.component.html',
  styleUrl: './expense-drawer.component.scss',
})
export class ExpenseDrawerComponent {
  protected data = inject(AppDataService);

  closed = output<void>();

  form = new FormGroup({
    type: new FormControl<'expense' | 'income' | 'contribution'>('expense', { nonNullable: true }),
    value: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0.01)] }),
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    cat: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl(todayIso(), { nonNullable: true, validators: [Validators.required] }),
    method: new FormControl<string>('pix', { nonNullable: true, validators: [Validators.required] }),
    holder: new FormControl<Holder>('shared', { nonNullable: true, validators: [Validators.required] }),
    installments: new FormGroup({
      enabled: new FormControl(false, { nonNullable: true }),
      total: new FormControl(1, { nonNullable: true }),
    }),
    recurring: new FormControl(false, { nonNullable: true }),
  });

  stepInstallments(delta: number) {
    const ctrl = this.form.controls.installments.controls.total;
    const next = Math.max(1, ctrl.value + delta);
    ctrl.setValue(next);
  }

  onClose() {
    this.closed.emit();
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const tx: Transaction = {
      id: '', // server assigns
      date: v.date,
      label: v.label,
      value: Number(v.value),
      cat: v.cat,
      holder: v.holder,
      method: v.method,
      installments: v.installments.enabled ? { n: 1, of: Number(v.installments.total) } : null,
      recurring: v.recurring,
    };
    this.data.createTransaction(tx);
    this.onClose();
  }
}
