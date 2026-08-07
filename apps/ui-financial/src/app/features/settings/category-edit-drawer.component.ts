import { Component, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Category } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  selector: 'cf-category-edit-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './category-edit-drawer.component.html',
  styleUrl: './category-edit-drawer.component.scss',
})
export class CategoryEditDrawerComponent {
  private data = inject(AppDataService);

  readonly category = input.required<Category>();
  readonly closed = output<void>();

  form = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    color: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    budget: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
  });

  constructor() {
    effect(() => {
      const c = this.category();
      this.form.setValue({ label: c.label, color: c.color, budget: c.budget });
      this.form.markAsPristine();
    });
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    // O id (slug) vem da categoria original: não é editável.
    this.data.updateCategory({ ...this.category(), ...v });
    this.closed.emit();
  }
}
