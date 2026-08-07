import { Component, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Goal } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  selector: 'cf-goal-edit-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './goal-edit-drawer.component.html',
  styleUrl: './goal-edit-drawer.component.scss',
})
export class GoalEditDrawerComponent {
  private data = inject(AppDataService);

  readonly goal = input.required<Goal>();
  readonly closed = output<void>();

  form = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    subtitle: new FormControl('', { nonNullable: true }),
    target: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    monthly: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    color: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl<Goal['type']>('sonho', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const g = this.goal();
      this.form.setValue({
        label: g.label,
        subtitle: g.subtitle,
        target: g.target,
        monthly: g.monthly,
        color: g.color,
        type: g.type,
      });
      this.form.markAsPristine();
    });
  }

  save() {
    if (this.form.invalid) return;
    // Espalha a meta original primeiro: balance e history são derivados e
    // precisam sobreviver ao merge.
    this.data.updateGoal({ ...this.goal(), ...this.form.getRawValue() });
    this.closed.emit();
  }
}
