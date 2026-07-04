import { Component, inject, input, output, computed } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';
import { AuthService } from '../../core/auth/auth.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { CardChipComponent } from '../../ui/card-chip/card-chip.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import type { Transaction } from '@caixa-familia/shared-types';

@Component({
  selector: 'cf-tx-detail-drawer',
  standalone: true,
  imports: [
    MoneyComponent,
    AvatarComponent,
    CatDotComponent,
    CardChipComponent,
    ProgressBarComponent,
    IconComponent,
  ],
  host: { '(document:keydown.escape)': 'onClose()' },
  templateUrl: './tx-detail-drawer.component.html',
  styleUrl: './tx-detail-drawer.component.scss',
})
export class TxDetailDrawerComponent {
  private data = inject(AppDataService);
  protected auth = inject(AuthService);

  tx = input.required<Transaction>();
  closed = output<void>();

  card = computed(() => this.data.cardBy()[this.tx().method] ?? null);
  catLabel = computed(() => this.data.catBy()[this.tx().cat]?.label ?? this.tx().cat);

  longDate = computed(() =>
    new Date(this.tx().date + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  );

  shortDate = computed(() =>
    new Date(this.tx().date + 'T12:00:00').toLocaleDateString('pt-BR')
  );

  segments = computed(() => {
    const inst = this.tx().installments;
    if (!inst) return [];
    return Array.from({ length: inst.of }, (_, i) => i < inst.n);
  });

  duplicate() {
    this.data.createTransaction({ ...this.tx(), id: '' });
    this.onClose();
  }

  remove() {
    this.data.removeTransaction(this.tx().id);
    this.onClose();
  }

  onClose() {
    this.closed.emit();
  }
}
