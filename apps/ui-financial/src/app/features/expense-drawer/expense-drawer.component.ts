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
  template: `
    <div class="backdrop" (click)="onClose()"></div>

    <div class="panel" [formGroup]="form">
      <!-- Header -->
      <header class="drawer-head">
        <div class="head-text">
          <div class="head-title">Novo lançamento</div>
          <span class="head-sub">{{ data.currentMonth().label }}</span>
        </div>
        <button type="button" class="close-btn" (click)="onClose()" aria-label="Fechar">
          <cf-icon name="x" [size]="12" />
        </button>
      </header>

      <!-- Body -->
      <div class="drawer-body">
        <!-- Tipo -->
        <div class="label">Tipo</div>
        <div class="seg seg-full">
          <button
            type="button"
            class="seg-btn"
            [class.active]="form.controls.type.value === 'expense'"
            (click)="form.controls.type.setValue('expense')"
          >
            <cf-icon name="arrowDown" [size]="11" /> Despesa
          </button>
          <button
            type="button"
            class="seg-btn"
            [class.active]="form.controls.type.value === 'income'"
            (click)="form.controls.type.setValue('income')"
          >
            <cf-icon name="arrowUp" [size]="11" /> Receita
          </button>
          <button
            type="button"
            class="seg-btn"
            [class.active]="form.controls.type.value === 'contribution'"
            (click)="form.controls.type.setValue('contribution')"
          >
            <cf-icon name="target" [size]="11" /> Aporte
          </button>
        </div>

        <!-- Valor -->
        <div class="label mt">Valor</div>
        <div class="value-row">
          <span class="value-prefix">R$</span>
          <input
            type="number"
            class="value-input num"
            formControlName="value"
            min="0"
            step="0.01"
            placeholder="0,00"
          />
        </div>

        <!-- Descrição -->
        <div class="label mt">Descrição</div>
        <input
          type="text"
          class="text-input"
          formControlName="label"
          placeholder="Ex.: Mercado mensal Guanabara"
        />

        <!-- Categoria -->
        <div class="label mt">Categoria</div>
        <div class="cat-grid">
          @for (cat of data.categories(); track cat.id) {
            <button
              type="button"
              class="cat-chip"
              [class.active]="form.controls.cat.value === cat.id"
              (click)="form.controls.cat.setValue(cat.id)"
            >
              <cf-cat-dot [catId]="cat.id" [size]="8" />
              {{ cat.label }}
            </button>
          }
        </div>

        <!-- Data -->
        <div class="label mt">Data</div>
        <input type="date" class="text-input num" formControlName="date" />

        <!-- Método -->
        <div class="label mt">Método de pagamento</div>
        <div class="method-list">
          <button
            type="button"
            class="method-row"
            [class.active]="form.controls.method.value === 'pix'"
            (click)="form.controls.method.setValue('pix')"
          >
            <span class="method-main">
              <cf-icon name="pix" [size]="13" color="var(--brand)" />
              <span class="method-text">
                <span class="method-name">Pix / Débito</span>
                <span class="method-sub">Conta corrente</span>
              </span>
            </span>
            @if (form.controls.method.value === 'pix') {
              <cf-icon name="check" [size]="13" color="var(--brand)" />
            }
          </button>

          @for (c of data.cards(); track c.id) {
            <button
              type="button"
              class="method-row"
              [class.active]="form.controls.method.value === c.id"
              (click)="form.controls.method.setValue(c.id)"
            >
              <span class="method-main">
                <cf-card-chip [cardId]="c.id" size="md" />
                <span class="method-text">
                  <span class="method-name">{{ c.bank }} ···{{ c.last4 }}</span>
                  <span class="method-sub num">fatura {{ c.current }}</span>
                </span>
              </span>
              @if (form.controls.method.value === c.id) {
                <cf-icon name="check" [size]="13" color="var(--brand)" />
              }
            </button>
          }
        </div>

        <!-- Quem fez o gasto -->
        <div class="label mt">Quem fez o gasto</div>
        <div class="seg seg-full">
          <button
            type="button"
            class="seg-btn"
            [class.active]="form.controls.holder.value === 'Mateus'"
            (click)="form.controls.holder.setValue('Mateus')"
          >
            <cf-avatar holder="Mateus" [size]="14" /> Mateus
          </button>
          <button
            type="button"
            class="seg-btn"
            [class.active]="form.controls.holder.value === 'Thais'"
            (click)="form.controls.holder.setValue('Thais')"
          >
            <cf-avatar holder="Thais" [size]="14" /> Thais
          </button>
          <button
            type="button"
            class="seg-btn"
            [class.active]="form.controls.holder.value === 'shared'"
            (click)="form.controls.holder.setValue('shared')"
          >
            Compartilhado
          </button>
        </div>

        <!-- Toggles -->
        <div class="toggle-grid mt" formGroupName="installments">
          <label class="toggle-row">
            <span class="toggle-label">Parcelar</span>
            <input type="checkbox" class="toggle-check" formControlName="enabled" />
          </label>
        </div>

        @if (form.controls.installments.controls.enabled.value) {
          <div class="installments-detail">
            <span class="label brand">Parcelado em</span>
            <div class="stepper" formGroupName="installments">
              <button type="button" class="step-btn" (click)="stepInstallments(-1)" aria-label="Menos">
                <cf-icon name="arrowLeft" [size]="9" />
              </button>
              <span class="step-value num">{{ form.controls.installments.controls.total.value }}×</span>
              <button type="button" class="step-btn" (click)="stepInstallments(1)" aria-label="Mais">
                <cf-icon name="arrowRight" [size]="9" />
              </button>
            </div>
          </div>
        }

        <div class="toggle-grid mt">
          <label class="toggle-row">
            <span class="toggle-label">Recorrente (gasto fixo)</span>
            <input type="checkbox" class="toggle-check" formControlName="recurring" />
          </label>
        </div>
      </div>

      <!-- Footer -->
      <footer class="drawer-foot">
        <span class="foot-hint">⌘/Ctrl + Enter para salvar</span>
        <button type="button" class="save-btn" [disabled]="form.invalid" (click)="save()">
          <cf-icon name="check" [size]="11" /> Salvar lançamento
        </button>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .backdrop {
      position: fixed; inset: 0;
      background: rgba(15, 20, 30, 0.32);
      z-index: 80;
      animation: cf-fade 200ms ease both;
    }

    .panel {
      position: fixed; top: 0; right: 0;
      height: 100vh; width: 460px;
      background: var(--surface);
      border-left: 1px solid var(--line);
      box-shadow: -12px 0 32px rgba(0, 0, 0, 0.15);
      display: flex; flex-direction: column;
      z-index: 81;
      animation: cf-slide 240ms cubic-bezier(.2, .7, .3, 1) both;
    }

    @keyframes cf-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes cf-slide { from { transform: translateX(100%); } to { transform: translateX(0); } }

    /* Header */
    .drawer-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid var(--line);
      flex-shrink: 0;
    }
    .head-text { display: flex; flex-direction: column; gap: 2px; }
    .head-title { font-size: 15px; font-weight: 600; color: var(--ink-1); }
    .head-sub { font-size: 12px; color: var(--ink-3); }
    .close-btn {
      width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--line); background: var(--surface);
      color: var(--ink-2); cursor: pointer;
    }
    .close-btn:hover { background: var(--surface-alt); }

    /* Body */
    .drawer-body { flex: 1; overflow: auto; padding: 16px 20px; }

    .label {
      font-size: 10.5px; font-weight: 600; color: var(--ink-3);
      text-transform: uppercase; letter-spacing: 0.6px;
      margin-bottom: 6px;
    }
    .label.mt { margin-top: 16px; }
    .label.brand { color: var(--brand); margin-bottom: 0; }

    /* Segmented control */
    .seg { display: inline-flex; border: 1px solid var(--line); background: var(--surface); height: 32px; }
    .seg-full { display: flex; width: 100%; }
    .seg-btn {
      flex: 1;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 0 10px; font-size: 12px; color: var(--ink-2);
      border-right: 1px solid var(--line);
      border-top: 0; border-bottom: 0; border-left: 0; background: none;
      cursor: pointer;
    }
    .seg-btn:last-child { border-right: 0; }
    .seg-btn.active { background: var(--ink-1); color: #fff; }

    /* Value */
    .value-row { display: flex; align-items: baseline; gap: 6px; border-bottom: 2px solid var(--brand); padding-bottom: 4px; }
    .value-prefix { font-size: 20px; color: var(--ink-3); }
    .value-input {
      flex: 1; min-width: 0;
      border: 0; background: none; outline: none;
      font-size: 32px; font-weight: 600; letter-spacing: -0.8px;
      color: var(--ink-1); font-family: inherit;
    }
    .value-input::-webkit-outer-spin-button,
    .value-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

    /* Text inputs */
    .text-input {
      width: 100%;
      border: 1px solid var(--line); background: var(--surface);
      padding: 8px 10px; font-size: 13px; color: var(--ink-1);
      font-family: inherit; outline: none;
    }
    .text-input:focus { border-color: var(--brand); }

    /* Category grid */
    .cat-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .cat-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 9px; font-size: 12px; color: var(--ink-2);
      border: 1px solid var(--line); background: var(--surface);
      cursor: pointer;
    }
    .cat-chip:hover { background: var(--surface-alt); }
    .cat-chip.active { border-color: var(--brand); background: var(--brand-soft); color: var(--ink-1); }

    /* Method list */
    .method-list { border: 1px solid var(--line); max-height: 184px; overflow: auto; }
    .method-row {
      display: flex; align-items: center; justify-content: space-between;
      width: 100%; padding: 8px 10px; text-align: left;
      border: 0; border-bottom: 1px solid var(--line-soft); background: none;
      cursor: pointer;
    }
    .method-row:last-child { border-bottom: 0; }
    .method-row:hover { background: var(--surface-alt); }
    .method-row.active { background: var(--brand-soft); }
    .method-main { display: flex; align-items: center; gap: 8px; }
    .method-text { display: flex; flex-direction: column; }
    .method-name { font-size: 12.5px; font-weight: 500; color: var(--ink-1); }
    .method-sub { font-size: 11px; color: var(--ink-3); }

    /* Toggles */
    .toggle-grid { display: block; }
    .toggle-row {
      display: flex; align-items: center; justify-content: space-between;
      border: 1px solid var(--line); padding: 8px 10px;
      cursor: pointer;
    }
    .toggle-label { font-size: 12.5px; color: var(--ink-1); }
    .toggle-check { accent-color: var(--brand); cursor: pointer; }

    .installments-detail {
      display: flex; align-items: center; justify-content: space-between;
      border: 1px solid var(--brand-soft); background: var(--brand-soft);
      padding: 10px 12px; margin-top: 12px;
    }
    .stepper { display: flex; align-items: center; gap: 8px; }
    .step-btn {
      width: 22px; height: 22px;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--line); background: var(--surface);
      color: var(--ink-2); cursor: pointer;
    }
    .step-btn:hover { background: var(--surface-alt); }
    .step-value { font-size: 13px; font-weight: 600; color: var(--ink-1); }

    /* Footer */
    .drawer-foot {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px;
      border-top: 1px solid var(--line);
      background: var(--surface-sunk);
      flex-shrink: 0;
    }
    .foot-hint { font-size: 12px; color: var(--ink-3); }
    .save-btn {
      display: inline-flex; align-items: center; gap: 6px;
      height: 30px; padding: 0 16px;
      font-size: 12px; font-weight: 500;
      background: var(--ink-1); color: #fff;
      border: 0; cursor: pointer;
    }
    .save-btn:disabled { opacity: 0.5; cursor: default; }
    .save-btn:not(:disabled):hover { opacity: 0.9; }
  `],
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
      id: 't' + Date.now(),
      date: v.date,
      label: v.label,
      value: Number(v.value),
      cat: v.cat,
      holder: v.holder,
      method: v.method,
      installments: v.installments.enabled ? { n: 1, of: Number(v.installments.total) } : null,
      recurring: v.recurring,
    };
    this.data.transactions.update(prev => [tx, ...prev]);
    this.onClose();
  }
}
