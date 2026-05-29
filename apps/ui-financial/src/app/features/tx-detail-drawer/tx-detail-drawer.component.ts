import { Component, inject, input, output, computed } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';
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
  template: `
    <div
      class="backdrop"
      role="button"
      tabindex="0"
      aria-label="Fechar"
      (click)="onClose()"
      (keydown.enter)="onClose()"
      (keydown.space)="onClose()"
    ></div>

    <aside class="panel">
      <!-- Header -->
      <header class="head">
        <div class="head-info">
          <div class="head-title-row">
            <span class="head-title">Detalhe do lançamento</span>
            <span class="pill pill-brand num">#{{ tx().id.toUpperCase() }}</span>
          </div>
          <span class="meta">{{ longDate() }}</span>
        </div>
        <button type="button" class="icon-btn" (click)="onClose()" aria-label="Fechar">
          <cf-icon name="x" [size]="11" />
        </button>
      </header>

      <!-- Big value block -->
      <div class="value-block">
        <div class="label">{{ tx().installments ? 'Valor da parcela' : 'Valor' }}</div>
        <div class="value-row">
          <cf-money [value]="tx().value" size="xxl" [negColor]="false" />
          @if (tx().installments; as inst) {
            <span class="pill pill-brand">parcela {{ inst.n }}/{{ inst.of }}</span>
          }
        </div>
        <div class="value-label">{{ tx().label }}</div>
        <div class="meta value-paid">Pago em <span class="num">{{ shortDate() }}</span></div>
      </div>

      <!-- Detail rows -->
      <div class="body">
        <div class="drow">
          <span class="drow-label">Categoria</span>
          <div class="drow-value">
            <span class="inline">
              <cf-cat-dot [catId]="tx().cat" [size]="8" />
              <span class="strong">{{ catLabel() }}</span>
            </span>
          </div>
        </div>

        <div class="drow">
          <span class="drow-label">Método</span>
          <div class="drow-value">
            @if (card(); as c) {
              <span class="inline">
                <cf-card-chip [cardId]="tx().method" size="md" />
                <span class="col">
                  <span class="strong">{{ c.bank }} ···{{ c.last4 }}</span>
                  <span class="meta">fatura fecha dia {{ c.closing }}</span>
                </span>
              </span>
            } @else {
              <span class="inline">
                <cf-icon name="pix" [size]="12" color="var(--brand)" />
                <span>Pix / débito</span>
              </span>
            }
          </div>
        </div>

        <div class="drow">
          <span class="drow-label">Quem fez</span>
          <div class="drow-value">
            @if (tx().holder === 'shared') {
              <span class="inline">
                <span class="avatars">
                  <cf-avatar holder="Mateus" [size]="18" />
                  <cf-avatar holder="Thais" [size]="18" />
                </span>
                <span>Compartilhado</span>
              </span>
            } @else {
              <span class="inline">
                <cf-avatar [holder]="tx().holder" [size]="18" />
                <span>{{ tx().holder }}</span>
              </span>
            }
          </div>
        </div>

        @if (tx().installments; as inst) {
          <div class="drow">
            <span class="drow-label">Parcelamento</span>
            <div class="drow-value">
              <div class="inst">
                <div class="inst-top">
                  <span class="strong">{{ inst.n }} de {{ inst.of }} parcelas</span>
                  <span class="meta num inst-total">
                    total: <cf-money [value]="tx().value * inst.of" size="sm" [negColor]="false" />
                  </span>
                </div>
                <cf-progress-bar [value]="inst.n" [max]="inst.of" [color]="'var(--brand)'" [height]="4" />
                <div class="segments">
                  @for (seg of segments(); track $index) {
                    <span class="segment" [style.background]="seg ? 'var(--brand)' : 'var(--line)'"></span>
                  }
                </div>
              </div>
            </div>
          </div>
        }

        <div class="drow">
          <span class="drow-label">Recorrência</span>
          <div class="drow-value">
            @if (tx().recurring) {
              <span class="inline">
                <cf-icon name="repeat" [size]="11" color="var(--brand)" />
                <span>Mensal · ativa</span>
              </span>
            } @else {
              <span class="meta">Lançamento único</span>
            }
          </div>
        </div>

        <div class="drow drow-last">
          <span class="drow-label">Anotação</span>
          <div class="drow-value">
            @if (tx().note) {
              <span class="note">{{ tx().note }}</span>
            } @else {
              <span class="meta">Sem anotação.</span>
            }
          </div>
        </div>

        <!-- History block (mock) -->
        <div class="hist-card">
          <div class="hist-head"><span class="hist-title">Histórico</span></div>
          <div class="hist-body">
            <div class="hist-line">
              <span class="hist-dot"></span>
              <span class="meta">Criado em <span class="num">{{ shortDate() }}</span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer actions -->
      <footer class="foot">
        <div class="foot-group">
          <button type="button" class="btn ghost" (click)="duplicate()">Duplicar</button>
          <button type="button" class="btn ghost btn-neg" (click)="remove()">Excluir</button>
        </div>
        <div class="foot-group">
          <button type="button" class="btn ghost" disabled>Editar</button>
          <button type="button" class="btn btn-primary" disabled>Marcar como conferido</button>
        </div>
      </footer>
    </aside>
  `,
  styles: [`
    :host { display: block; }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 20, 30, 0.30);
      z-index: 80;
      animation: cf-fade 200ms ease;
    }
    @keyframes cf-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .panel {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: 480px;
      background: var(--surface);
      border-left: 1px solid var(--line);
      box-shadow: -12px 0 32px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      z-index: 81;
      animation: cf-slide 240ms cubic-bezier(.2, .7, .3, 1);
    }
    @keyframes cf-slide {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    /* Shared bits */
    .meta { font-size: 11.5px; color: var(--ink-4); }
    .strong { font-size: 12.5px; font-weight: 500; color: var(--ink-1); }
    .inline { display: inline-flex; align-items: center; gap: 8px; }
    .col { display: flex; flex-direction: column; gap: 1px; }

    .pill {
      display: inline-flex;
      align-items: center;
      padding: 1px 7px;
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.3px;
      background: var(--surface-alt);
      border: 1px solid var(--line);
      color: var(--ink-3);
      white-space: nowrap;
    }
    .pill-brand {
      background: var(--brand-soft);
      border-color: var(--brand-soft);
      color: var(--brand);
    }

    /* Header */
    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--line);
      flex-shrink: 0;
    }
    .head-info { display: flex; flex-direction: column; gap: 3px; }
    .head-title-row { display: flex; align-items: center; gap: 6px; }
    .head-title { font-size: 15px; font-weight: 600; color: var(--ink-1); }

    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--ink-2);
      cursor: pointer;
      flex-shrink: 0;
    }
    .icon-btn:hover { background: var(--surface-alt); }

    /* Big value */
    .value-block {
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--line);
      background: var(--surface-sunk);
      flex-shrink: 0;
    }
    .label {
      font-size: 10.5px;
      color: var(--ink-3);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-weight: 600;
    }
    .value-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      margin-top: 4px;
    }
    .value-label {
      margin-top: 12px;
      font-size: 14px;
      font-weight: 500;
      color: var(--ink-1);
    }
    .value-paid { margin-top: 2px; }

    /* Body / detail rows */
    .body {
      flex: 1;
      overflow: auto;
      padding: 14px 20px;
    }
    .drow {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid var(--line-soft);
    }
    .drow-last { border-bottom: 0; }
    .drow-label {
      width: 110px;
      flex-shrink: 0;
      padding-top: 2px;
      font-size: 10.5px;
      color: var(--ink-3);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-weight: 600;
    }
    .drow-value {
      flex: 1;
      min-width: 0;
      font-size: 12px;
      color: var(--ink-2);
    }

    .avatars { display: inline-flex; align-items: center; }
    .avatars cf-avatar:last-child { margin-left: -5px; opacity: 0.85; }

    /* Installments */
    .inst { display: flex; flex-direction: column; gap: 4px; width: 100%; }
    .inst-top { display: flex; align-items: center; justify-content: space-between; }
    .inst-total { display: inline-flex; align-items: center; gap: 4px; }
    .segments { display: flex; gap: 3px; }
    .segment { flex: 1; height: 4px; }

    .note { font-size: 12px; color: var(--ink-2); line-height: 1.5; }

    /* History */
    .hist-card {
      margin-top: 16px;
      background: var(--surface-sunk);
      border: 1px solid var(--line);
    }
    .hist-head {
      padding: 8px 14px;
      border-bottom: 1px solid var(--line-soft);
    }
    .hist-title {
      font-size: 11px;
      color: var(--ink-3);
      text-transform: uppercase;
      letter-spacing: 0.7px;
      font-weight: 600;
    }
    .hist-body { padding: 8px 14px; }
    .hist-line { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
    .hist-dot { width: 4px; height: 4px; background: var(--ink-4); border-radius: 2px; flex-shrink: 0; }

    /* Footer */
    .foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 12px 20px;
      border-top: 1px solid var(--line);
      background: var(--surface-sunk);
      flex-shrink: 0;
    }
    .foot-group { display: flex; align-items: center; gap: 8px; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 30px;
      padding: 0 12px;
      font-size: 12px;
      font-family: inherit;
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--ink-1);
      cursor: pointer;
    }
    .btn.ghost:hover:not(:disabled) { background: var(--surface-alt); }
    .btn-neg { color: var(--neg); }
    .btn-primary {
      padding: 0 16px;
      background: var(--brand);
      border-color: var(--brand);
      color: #fff;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class TxDetailDrawerComponent {
  private data = inject(AppDataService);

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
    const copy = { ...this.tx(), id: 't' + Date.now() };
    this.data.transactions.update(prev => [copy, ...prev]);
    this.onClose();
  }

  remove() {
    const id = this.tx().id;
    this.data.transactions.update(prev => prev.filter(t => t.id !== id));
    this.onClose();
  }

  onClose() {
    this.closed.emit();
  }
}
