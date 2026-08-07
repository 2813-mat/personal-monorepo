import { Component, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { FixedExpense, Holder } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  selector: 'cf-fixed-edit-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './fixed-edit-drawer.component.html',
  styleUrl: './fixed-edit-drawer.component.scss',
})
export class FixedEditDrawerComponent {
  protected data = inject(AppDataService);

  readonly fixed = input.required<FixedExpense>();
  readonly closed = output<void>();

  form = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    value: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    due: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(31)],
    }),
    cat: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    holder: new FormControl<Holder>('shared', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const f = this.fixed();
      this.form.setValue({
        label: f.label,
        value: f.value,
        due: f.due,
        cat: f.cat,
        holder: f.holder,
      });
      this.form.markAsPristine();
    });
  }

  save() {
    if (this.form.invalid) return;
    // paidThisMonth é derivado e sobrevive pelo espalhamento do original.
    this.data.updateFixed({ ...this.fixed(), ...this.form.getRawValue() });
    this.closed.emit();
  }
}
