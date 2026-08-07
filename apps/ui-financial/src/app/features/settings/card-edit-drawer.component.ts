import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Card, Holder } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { IconComponent } from '../../ui/icon/icon.component';

const VAZIO = {
  name: '',
  bank: '',
  color: '#1F4E79',
  last4: '',
  limit: 0,
  closing: 1,
  due: 8,
  holder: 'shared' as Holder,
};

@Component({
  selector: 'cf-card-edit-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './card-edit-drawer.component.html',
  styleUrl: './card-edit-drawer.component.scss',
})
export class CardEditDrawerComponent {
  private data = inject(AppDataService);

  /** Ausente significa criação. */
  readonly card = input<Card | null>(null);
  readonly closed = output<void>();

  protected isEditing = computed(() => this.card() !== null);

  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    bank: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    color: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    // Quatro dígitos, não quatro caracteres — espelha o @Matches do DTO.
    last4: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{4}$/)],
    }),
    limit: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    closing: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(31)],
    }),
    due: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(31)],
    }),
    holder: new FormControl<Holder>('shared', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const c = this.card();
      this.form.setValue(
        c
          ? {
              name: c.name,
              bank: c.bank,
              color: c.color,
              last4: c.last4,
              limit: c.limit,
              closing: c.closing,
              due: c.due,
              holder: c.holder,
            }
          : { ...VAZIO },
      );
      this.form.markAsPristine();
    });
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const existing = this.card();
    // No modo edição o id, a fatura do ciclo e o arquivamento vêm do original:
    // nenhum dos três é editável neste formulário.
    if (existing) this.data.updateCard({ ...existing, ...v });
    else this.data.createCard(v);
    this.closed.emit();
  }
}
