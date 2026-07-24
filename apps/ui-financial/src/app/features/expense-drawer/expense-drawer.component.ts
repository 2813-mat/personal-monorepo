import { Component, inject, output } from '@angular/core';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import type { FixedExpense, Holder, Income, Transaction } from '@caixa-familia/shared-types';
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
    type: new FormControl<'expense' | 'income' | 'contribution' | 'fixed'>('expense', { nonNullable: true }),
    value: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0.01)] }),
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    cat: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl(todayIso(), { nonNullable: true, validators: [Validators.required] }),
    dueDay: new FormControl<number | null>(null),
    method: new FormControl<string>('pix', { nonNullable: true, validators: [Validators.required] }),
    holder: new FormControl<Holder>('shared', { nonNullable: true, validators: [Validators.required] }),
    installments: new FormGroup({
      enabled: new FormControl(false, { nonNullable: true }),
      total: new FormControl(1, { nonNullable: true }),
    }),
    recurring: new FormControl(false, { nonNullable: true }),
  });

  constructor() {
    this.form.controls.type.valueChanges.subscribe((type) => {
      const cat = this.form.controls.cat;
      if (type === 'income') {
        cat.clearValidators();
      } else {
        cat.setValidators([Validators.required]);
      }
      cat.updateValueAndValidity();

      // A fixed expense is a template with a due day, not a dated payment.
      const dueDay = this.form.controls.dueDay;
      const date = this.form.controls.date;
      if (type === 'fixed') {
        dueDay.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);
        date.clearValidators();
      } else {
        dueDay.clearValidators();
        date.setValidators([Validators.required]);
      }
      dueDay.updateValueAndValidity();
      date.updateValueAndValidity();
    });
  }

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

    if (v.type === 'fixed') {
      const fixed: FixedExpense = {
        id: '', // server assigns
        label: v.label,
        value: Number(v.value),
        due: Number(v.dueDay),
        cat: v.cat,
        holder: v.holder,
        paidThisMonth: false,
      };
      this.data.createFixed(fixed);
      this.onClose();
      return;
    }

    if (v.type === 'income') {
      const income: Income = {
        id: '', // server assigns
        label: v.label,
        holder: v.holder,
        value: Number(v.value),
        date: v.date,
        recurring: v.recurring,
      };
      this.data.createIncome(income);
      this.onClose();
      return;
    }

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
